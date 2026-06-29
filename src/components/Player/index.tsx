import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useFBX, useAnimations } from '@react-three/drei'
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { Group, Vector3 } from 'three'
import { usePlayerControls } from './usePlayerControls'
import { useGameStore } from '../../systems/StabilitySystem'
import { useCutsceneStore } from '../../systems/CutsceneSystem'

const PLAYER_URL = '/assets/characters/Exo Gray.fbx'
const IDLE_URL = '/assets/animations/Breathing Idle.fbx'
const WALK_URL = '/assets/animations/Walking-2.fbx'
const RUN_URL = '/assets/animations/Running-2.fbx'
const JUMP_URL = '/assets/animations/Jumping-2.fbx'

// Mixamo models are ~180u tall; 0.01 brings them to ~1.8 world units.
const MODEL_SCALE = 0.01
const SPEED_WALK = 3
const SPEED_RUN = 7
const JUMP_VELOCITY = 6

// Capsule: radius 0.3 + half-height 0.6 => ~1.8u tall, centre at y=0.9.
const CAP_RADIUS = 0.3
const CAP_HALF = 0.6
const FEET_OFFSET = -(CAP_RADIUS + CAP_HALF) // model feet vs capsule centre

const SPAWN: [number, number, number] = [0, 1.2, 24]

interface PlayerProps {
  /** Shared vector the camera reads to follow the player. */
  targetRef: RefObject<Vector3>
}

/**
 * Third-person player: Exo Gray on a capsule rigid body, driven by WASD with
 * Shift-run and Space-jump, with idle/walk/run/jump animation blending and
 * smooth turn-to-face-movement. Movement is camera-relative.
 */
export default function Player({ targetRef }: PlayerProps) {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<Group>(null)
  const camera = useThree((s) => s.camera)
  const { world, rapier } = useRapier()
  const controls = usePlayerControls()
  const isConsoleOpen = useGameStore((s) => s.isConsoleOpen)
  const isDialogueActive = useGameStore((s) => s.currentDialogue !== null)
  const isCutsceneActive = useCutsceneStore((s) => s.activeCutscene !== null)
  const frozen = isConsoleOpen || isDialogueActive || isCutsceneActive

  // Character mesh + the four animation clips (named for useAnimations).
  const model = useFBX(PLAYER_URL)
  const idleFbx = useFBX(IDLE_URL)
  const walkFbx = useFBX(WALK_URL)
  const runFbx = useFBX(RUN_URL)
  const jumpFbx = useFBX(JUMP_URL)

  const clips = useMemo(() => {
    // Some Mixamo FBX exports carry an empty placeholder clip at [0] plus the
    // real animation ("mixamo.com") after it — pick whichever has the most
    // tracks so we never grab the empty one (that caused a T-pose idle).
    const best = (fbx: Group) =>
      fbx.animations.reduce((a, b) => (b.tracks.length > a.tracks.length ? b : a))
    const idle = best(idleFbx).clone()
    const walk = best(walkFbx).clone()
    const run = best(runFbx).clone()
    const jump = best(jumpFbx).clone()
    idle.name = 'idle'
    walk.name = 'walk'
    run.name = 'run'
    jump.name = 'jump'

    // Strip root-motion position tracks from Mixamo animations. Without this
    // the skeleton's hip bone translates forward inside the clip, fighting the
    // physics velocity and causing the character to stutter/lag behind.
    for (const clip of [walk, run, jump]) {
      clip.tracks = clip.tracks.filter((track) => {
        // Mixamo root bone is usually "mixamorigHips" — strip its .position track
        if (track.name.endsWith('.position')) {
          const boneName = track.name.split('.')[0]
          if (boneName.toLowerCase().includes('hips') || boneName.toLowerCase().includes('root')) {
            return false
          }
        }
        return true
      })
    }

    return [idle, walk, run, jump]
  }, [idleFbx, walkFbx, runFbx, jumpFbx])

  const { actions } = useAnimations(clips, visual)
  const currentAction = useRef<string>('')

  // Enable shadows on the character meshes once.
  useEffect(() => {
    model.traverse((o) => {
      o.castShadow = true
    })
  }, [model])

  // Start in idle once actions are ready.
  useEffect(() => {
    actions.idle?.reset().fadeIn(0.2).play()
    currentAction.current = 'idle'
  }, [actions])

  const playAction = (name: string) => {
    if (currentAction.current === name) return
    actions[currentAction.current]?.fadeOut(0.2)
    actions[name]?.reset().fadeIn(0.2).play()
    currentAction.current = name
  }

  // Reusable scratch vectors (avoid per-frame allocation).
  const forwardV = useMemo(() => new Vector3(), [])
  const rightV = useMemo(() => new Vector3(), [])
  const moveV = useMemo(() => new Vector3(), [])
  const jumpLatch = useRef(false)

  useFrame((_, delta) => {
    const rb = body.current
    if (!rb) return

    // --- Grounded check: short ray straight down from the capsule centre. ---
    const t = rb.translation()
    const ray = new rapier.Ray(t, { x: 0, y: -1, z: 0 })
    const hit = world.castRay(ray, 1.05, true, undefined, undefined, undefined, rb)
    const grounded = hit !== null

    // --- Camera-relative input direction on the XZ plane. ---
    camera.getWorldDirection(forwardV)
    forwardV.y = 0
    forwardV.normalize()
    rightV.set(-forwardV.z, 0, forwardV.x) // forward rotated 90° about Y

    const c = controls.current
    const fb = frozen ? 0 : (c.forward ? 1 : 0) - (c.backward ? 1 : 0)
    const lr = frozen ? 0 : (c.right ? 1 : 0) - (c.left ? 1 : 0)
    moveV.set(0, 0, 0).addScaledVector(forwardV, fb).addScaledVector(rightV, lr)
    const moving = moveV.lengthSq() > 0
    if (moving) moveV.normalize()

    // --- Horizontal velocity (preserve gravity/jump on Y). ---
    const speed = (c.run && !frozen) ? SPEED_RUN : SPEED_WALK
    const vy = rb.linvel().y
    rb.setLinvel(
      { x: moveV.x * speed, y: vy, z: moveV.z * speed },
      true
    )

    // --- Jump: only when grounded, and only once per press (single jump). ---
    if (c.jump && !frozen && grounded && !jumpLatch.current) {
      rb.setLinvel({ x: moveV.x * speed, y: JUMP_VELOCITY, z: moveV.z * speed }, true)
      jumpLatch.current = true
    }
    if (!c.jump) jumpLatch.current = false

    // --- Smooth rotation to face movement direction (shortest arc). ---
    if (moving && visual.current) {
      const targetYaw = Math.atan2(moveV.x, moveV.z)
      const cur = visual.current.rotation.y
      let diff = targetYaw - cur
      diff = Math.atan2(Math.sin(diff), Math.cos(diff)) // wrap to [-PI, PI]
      visual.current.rotation.y = cur + diff * Math.min(1, delta * 12)
    }

    // --- Animation state. ---
    if (!grounded) playAction('jump')
    else if (moving) playAction(c.run ? 'run' : 'walk')
    else playAction('idle')

    // --- Publish position for the camera to follow. ---
    targetRef.current?.set(t.x, t.y, t.z)
  })

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={SPAWN}
      enabledRotations={[false, false, false]}
      ccd
    >
      <CapsuleCollider args={[CAP_HALF, CAP_RADIUS]} friction={0.2} />
      {/* Visual group is the animation root; offset so feet meet capsule base. */}
      <group ref={visual} position={[0, FEET_OFFSET, 0]}>
        <primitive object={model} scale={MODEL_SCALE} />
      </group>
    </RigidBody>
  )
}

useFBX.preload(PLAYER_URL)
useFBX.preload(IDLE_URL)
useFBX.preload(WALK_URL)
useFBX.preload(RUN_URL)
useFBX.preload(JUMP_URL)
