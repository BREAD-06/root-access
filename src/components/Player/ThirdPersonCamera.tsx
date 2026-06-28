import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { Vector3 } from 'three'
import { useGameStore } from '../../systems/StabilitySystem'

const DISTANCE = 5 // units behind the player
const HEIGHT = 2 // units above the player
const LOOK_HEIGHT = 1.2 // aim at the player's upper body
const MOUSE_SENSITIVITY = 0.005
const HANDOFF_MS = 4100 // let the cinematic intro pan finish first

interface ThirdPersonCameraProps {
  /** Shared vector written by the Player each frame. */
  targetRef: RefObject<Vector3>
}

/**
 * Follows the player from behind and slightly above with a smooth, frame-rate
 * independent lerp. The mouse orbits the camera horizontally (while pointer is
 * locked). A single physics raycast pulls the camera in so it never clips
 * through buildings — far cheaper than raycasting the whole scene graph.
 */
export default function ThirdPersonCamera({ targetRef }: ThirdPersonCameraProps) {
  const camera = useThree((s) => s.camera)
  const { world, rapier } = useRapier()

  const yaw = useRef(0)
  const pitch = useRef(0) // 0 is horizontal
  
  // AAA Smoothing: Decouple raw input from actual rotation
  const targetYaw = useRef(0)
  const targetPitch = useRef(0)
  
  const active = useRef(false)

  const from = useMemo(() => new Vector3(), [])
  const desired = useMemo(() => new Vector3(), [])
  const dir = useMemo(() => new Vector3(), [])
  const lookAt = useMemo(() => new Vector3(), [])

  // Horizontal and vertical orbit from mouse movement (only while pointer-locked).
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement && !useGameStore.getState().isConsoleOpen) {
        targetYaw.current -= e.movementX * MOUSE_SENSITIVITY
        // Pitch with limits to avoid looking completely straight up or down
        targetPitch.current += e.movementY * MOUSE_SENSITIVITY
        targetPitch.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 2.2, targetPitch.current))
      }
    }
    const onClick = () => {
      if (!document.pointerLockElement && document.activeElement?.tagName !== 'INPUT') {
        document.body.requestPointerLock().catch(() => {})
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('click', onClick)
    }
  }, [])

  // Take over from the cinematic intro pan.
  useEffect(() => {
    const id = window.setTimeout(() => {
      active.current = true
    }, HANDOFF_MS)
    return () => window.clearTimeout(id)
  }, [])

  useFrame((_, delta) => {
    if (!active.current || !targetRef.current) return
    const target = targetRef.current

    // 1. AAA Camera Smoothing: Spring interpolation for yaw/pitch
    // We use exponential decay which acts like a critically damped spring
    // A multiplier of 15 gives a snappy but buttery smooth ease-out.
    const rotationBlend = 1 - Math.exp(-15 * delta)
    yaw.current += (targetYaw.current - yaw.current) * rotationBlend
    pitch.current += (targetPitch.current - pitch.current) * rotationBlend

    // 2. Desired camera position: offset behind (by yaw) and above/below (by pitch).
    // Spherical coordinates around the player:
    const horizontalDistance = Math.cos(pitch.current) * DISTANCE
    const verticalOffset = Math.sin(pitch.current) * DISTANCE
    
    desired
      .set(Math.sin(yaw.current) * horizontalDistance, 0, Math.cos(yaw.current) * horizontalDistance)
      .add(target)
    desired.y = target.y + HEIGHT + verticalOffset

    // Cheap collision: one physics ray from above the player out to the camera.
    // The origin sits above the capsule, so it never self-hits the player.
    from.set(target.x, target.y + LOOK_HEIGHT, target.z)
    dir.copy(desired).sub(from)
    const fullDist = dir.length()
    if (fullDist > 0.001) {
      dir.divideScalar(fullDist)
      const ray = new rapier.Ray(
        { x: from.x, y: from.y, z: from.z },
        { x: dir.x, y: dir.y, z: dir.z }
      )
      const hit = world.castRay(ray, fullDist, true)
      if (hit) {
        desired
          .copy(from)
          .addScaledVector(dir, Math.max(0.6, hit.timeOfImpact - 0.3))
      }
    }

    // Very fast lerp — feels instant but eliminates single-frame jitter
    // Increased from 25 to 60 to tightly track the player and stop the "lagging behind" feel
    camera.position.lerp(desired, 1 - Math.exp(-60 * delta))
    
    // Look at target plus our pitch offset, so the camera doesn't always stare at feet when high up
    lookAt.set(target.x, target.y + LOOK_HEIGHT, target.z)
    camera.lookAt(lookAt)

    // Export coordinates to window for global HUD updates (high-performance rendering)
    ;(window as any).__cameraYaw = yaw.current
    ;(window as any).__playerPosition = target
  })

  return null
}
