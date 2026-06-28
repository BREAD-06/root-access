import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useFBX } from '@react-three/drei'
import { useGameStore } from '../../systems/StabilitySystem'
import WorldObject from '../World/WorldObject'
import { Vector3 } from 'three'
import type { Group } from 'three'

const NPC_MODEL_URL =
  '/assets/characters/enemies/patroldrones/FreeLowPolyRobot/Meshes_and_Animations/ModularRobots.fbx'

interface NPCState {
  id: string
  position: [number, number, number]
  targetX: number
  targetZ: number
  speed: number
  rotationY: number
}

const BLOCK_COORDS = [-60, -40, -20, 0, 20, 40, 60]

function SingleNPC({ npc }: { npc: NPCState }) {
  const model = useFBX(NPC_MODEL_URL)
  const groupRef = useRef<Group>(null)

  const currentAct = useGameStore((state) => state.currentAct)
  const isFrozen = useGameStore((state) => state.worldMutations[`freeze:${npc.id}`])
  const isDeleted = useGameStore((state) => state.worldMutations[`delete:${npc.id}`])
  const isGravity = useGameStore((state) => state.worldMutations[`gravity:${npc.id}`])
  const isConsoleOpen = useGameStore((state) => state.isConsoleOpen)

  // Scratch vectors — allocated once
  const targetPos = useRef(new Vector3(npc.targetX, 0, npc.targetZ))
  const currentPos = useRef(new Vector3(...npc.position))
  const dir = useRef(new Vector3())
  const glitchTimer = useRef(0)

  // Clone the model once
  const modelClone = useMemo(() => {
    const c = model.clone(true)
    // Disable shadows on NPCs for performance
    c.traverse((o) => {
      o.castShadow = false
      o.receiveShadow = false
    })
    return c
  }, [model])

  useFrame((_, delta) => {
    if (isFrozen || isDeleted || isGravity || !groupRef.current) return
    
    // Scale delta for bullet time
    const dt = isConsoleOpen ? delta * 0.05 : delta

    // Act 5: NPCs are deleted from the simulation
    if (currentAct === 'act5') {
      groupRef.current.visible = false
      return
    }

    // Act 4: Severe glitches (teleporting, disappearing)
    if (currentAct === 'act4') {
      if (Math.random() < 0.005) {
        groupRef.current.visible = !groupRef.current.visible
      }
      if (Math.random() < 0.01 && glitchTimer.current <= 0) {
        currentPos.current.x += (Math.random() - 0.5) * 4
        currentPos.current.z += (Math.random() - 0.5) * 4
        glitchTimer.current = 1.0
      }
    }
    
    // Act 2: Subtle animation skips
    if (currentAct === 'act2' && Math.random() < 0.02) {
      return // skip frame update
    }
    
    if (glitchTimer.current > 0) glitchTimer.current -= dt

    // Check if simulation act has NPC glitches enabled
    const isGlitching = currentAct === 'act4'

    // Reuse scratch vector instead of allocating
    dir.current.copy(targetPos.current).sub(currentPos.current)
    const dist = dir.current.length()

    if (dist < 0.2) {
      // Reached junction, pick next intersection
      const cx = currentPos.current.x
      const cz = currentPos.current.z

      let gx = BLOCK_COORDS.findIndex((c) => Math.abs(c - cx) < 1.0)
      let gz = BLOCK_COORDS.findIndex((c) => Math.abs(c - cz) < 1.0)
      if (gx === -1) gx = 3
      if (gz === -1) gz = 3

      const options: [number, number][] = []
      if (gx > 0) options.push([BLOCK_COORDS[gx - 1], cz])
      if (gx < BLOCK_COORDS.length - 1) options.push([BLOCK_COORDS[gx + 1], cz])
      if (gz > 0) options.push([cx, BLOCK_COORDS[gz - 1]])
      if (gz < BLOCK_COORDS.length - 1) options.push([cx, BLOCK_COORDS[gz + 1]])

      if (options.length > 0) {
        const pick = options[Math.floor(Math.random() * options.length)]
        targetPos.current.set(pick[0], 0, pick[1])
      }
    } else {
      dir.current.normalize()
      currentPos.current.addScaledVector(dir.current, npc.speed * dt)

      // Add high-frequency visual position jitter if glitching
      let jX = 0, jY = 0, jZ = 0
      if (isGlitching && Math.random() < 0.15) {
        jX = (Math.random() - 0.5) * 0.5
        jY = (Math.random() - 0.5) * 0.3
        jZ = (Math.random() - 0.5) * 0.5
      }

      // Mutate Three.js objects directly — no React re-render
      groupRef.current.position.set(
        currentPos.current.x + jX,
        0.05 + jY,
        currentPos.current.z + jZ
      )
      groupRef.current.rotation.y = Math.atan2(dir.current.x, dir.current.z)

      // Glitch scale stuttering
      if (isGlitching && Math.random() < 0.08) {
        const sG = 1.0 + (Math.random() - 0.5) * 0.4
        groupRef.current.scale.set(sG, sG, sG)
      } else {
        groupRef.current.scale.set(1.0, 1.0, 1.0)
      }
    }
  })

  return (
    <group ref={groupRef} position={npc.position} rotation={[0, npc.rotationY, 0]}>
      <WorldObject
        name={npc.id}
        type="npc"
        position={[0, 0, 0]}
        scale={0.007}
      >
        <primitive object={modelClone} />
      </WorldObject>
    </group>
  )
}

export default function NPCManager() {
  const npcs = useMemo<NPCState[]>(() => {
    const list: NPCState[] = []
    const spawns: [number, number][] = [
      [-40, -40],
      [-20, 20],
      [0, -20],
      [20, 40],
      [40, 0],
      [60, -20],
      [-60, 60],
      [0, 60],
    ]

    spawns.forEach((spawn, idx) => {
      const [x, z] = spawn
      list.push({
        id: `npc_0${idx + 1}`,
        position: [x, 0.05, z],
        targetX: x,
        targetZ: z + 20,
        speed: 2 + Math.random() * 1.5,
        rotationY: 0,
      })
    })

    return list
  }, [])

  return (
    <group>
      {npcs.map((npc) => (
        <SingleNPC key={npc.id} npc={npc} />
      ))}
    </group>
  )
}

useFBX.preload(NPC_MODEL_URL)
