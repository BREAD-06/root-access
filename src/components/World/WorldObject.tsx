import React, { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../../systems/StabilitySystem'
import { Vector3 } from 'three'
import type { Group } from 'three'

interface WorldObjectProps {
  name: string
  type: 'building' | 'skyscraper' | 'lowDetail' | 'prop' | 'lamp' | 'npc'
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  cloneOffset?: [number, number, number]
  children: React.ReactNode
}

/**
 * WorldObject wraps any 3D entity in the simulation and applies reality mutations
 * (delete, clone, freeze, gravity) and environmental stability anomalies (jitter, float).
 *
 * Performance: the useFrame callback exits early (no work) when there are no
 * active mutations and the current act doesn't require per-frame effects.
 */
export default function WorldObject({
  name,
  type,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  cloneOffset = [0, 0, 5],
  children,
}: WorldObjectProps) {
  const groupRef = useRef<Group>(null)
  const innerRef = useRef<Group>(null)

  const currentAct = useGameStore((state) => state.currentAct)
  const mutations = useGameStore((state) => state.worldMutations)
  const isConsoleOpen = useGameStore((state) => state.isConsoleOpen)
  const stabilityPercent = useGameStore((state) => state.stabilityPercent)

  const isDeleted = mutations[`delete:${name}`]
  const isCloned = mutations[`clone:${name}`]
  const isFrozen = mutations[`freeze:${name}`]
  const isGravity = mutations[`gravity:${name}`]

  const hasMutation = isDeleted || isCloned || isFrozen || isGravity
  const needsPerFrame =
    hasMutation ||
    currentAct === 'act2' ||
    currentAct === 'act3' ||
    currentAct === 'act4' ||
    currentAct === 'act5'

  // Stable random parameters per instance
  const seedHash = useMemo(() => {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return Math.abs(hash)
  }, [name])

  const phaseOffset = useMemo(() => (seedHash % 100) * 0.1, [seedHash])
  const driftSpeed = useMemo(() => 0.5 + (seedHash % 5) * 0.2, [seedHash])
  const driftAmplitude = useMemo(() => 1 + (seedHash % 3) * 0.8, [seedHash])

  const scaleArr = useMemo<[number, number, number]>(
    () => (typeof scale === 'number' ? [scale, scale, scale] : scale),
    [scale]
  )

  const deleteTimerRef = useRef(0)
  const jitterTimerRef = useRef(0)
  const collapseTimerRef = useRef(0)
  const fullyHidden = useRef(false)

  // Isolated state refs for Act 3 transient levitation machine
  const levStateRef = useRef<'idle' | 'rising' | 'hovering' | 'falling' | 'cooldown'>('idle')
  const levTimerRef = useRef(0)
  const levHeightRef = useRef(0)
  const levSpeedRef = useRef(1)

  // Set object name for raycast targeting
  useEffect(() => {
    if (groupRef.current) groupRef.current.name = name
  }, [name])

  // Scratch vectors (allocated once, reused)
  const _jitter = useMemo(() => new Vector3(), [])

  useFrame((state, delta) => {
    if (fullyHidden.current || !innerRef.current) return
    // Fast exit: no mutations and act doesn't need per-frame work
    if (!needsPerFrame) return

    // Scale delta for bullet time
    const dt = isConsoleOpen ? delta * 0.05 : delta

    const g = innerRef.current

    // 1. DELETE animation
    if (isDeleted) {
      deleteTimerRef.current += dt
      if (deleteTimerRef.current >= 1.0) {
        fullyHidden.current = true
        g.visible = false
        return
      }
      g.position.y += delta * 15
      const shrink = 1.0 - deleteTimerRef.current
      g.scale.multiplyScalar(shrink)
      return
    }

    // 2. GRAVITY float
    if (isGravity) {
      g.position.y += dt * 4 * driftSpeed
      g.rotation.x += dt * 0.3
      g.rotation.z += dt * 0.2
    }

    const isSmallObject = type === 'prop' || type === 'lamp'
    const isLargeObject = type === 'building' || type === 'skyscraper' || type === 'lowDetail'
    const t = state.clock.getElapsedTime()

    // 3. Act 3 Jitter (Buildings) & Brief Levitation (Props/Lamps)
    if (currentAct === 'act3' && !isFrozen && !isGravity && !isDeleted) {
      if (isLargeObject) {
        if (Math.random() < 0.002 && jitterTimerRef.current <= 0) {
          jitterTimerRef.current = 0.25
        }
        if (jitterTimerRef.current > 0) {
          jitterTimerRef.current -= dt
          _jitter.set(
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.4
          )
          g.position.x = position[0] + _jitter.x
          g.position.z = position[2] + _jitter.z
        }
      } else if (isSmallObject) {
        if (levStateRef.current === 'idle') {
          if (Math.random() < 0.0005) {
            levStateRef.current = 'rising'
            levTimerRef.current = 1.0 + Math.random() * 1.5
            levHeightRef.current = 1.5 + (seedHash % 3) * 0.5
            levSpeedRef.current = 1.5 + (seedHash % 3) * 0.5
          }
        }

        if (levStateRef.current === 'rising') {
          g.position.y += dt * 3 * levSpeedRef.current
          g.position.x = position[0] + (Math.random() - 0.5) * 0.15
          g.position.z = position[2] + (Math.random() - 0.5) * 0.15
          if (g.position.y >= position[1] + levHeightRef.current) {
            g.position.y = position[1] + levHeightRef.current
            levStateRef.current = 'hovering'
          }
        } else if (levStateRef.current === 'hovering') {
          levTimerRef.current -= dt
          g.position.y = position[1] + levHeightRef.current + Math.sin(t * 8) * 0.08
          g.position.x = position[0] + (Math.random() - 0.5) * 0.1
          g.position.z = position[2] + (Math.random() - 0.5) * 0.1
          g.rotation.y += dt * 0.5
          if (levTimerRef.current <= 0) {
            levStateRef.current = 'falling'
          }
        } else if (levStateRef.current === 'falling') {
          g.position.y -= dt * 4 * levSpeedRef.current
          if (g.position.y <= position[1]) {
            g.position.y = position[1]
            g.position.x = position[0]
            g.position.z = position[2]
            g.rotation.y = rotation[1]
            levStateRef.current = 'cooldown'
            levTimerRef.current = 4.0 + Math.random() * 6.0
          }
        } else if (levStateRef.current === 'cooldown') {
          levTimerRef.current -= dt
          if (levTimerRef.current <= 0) {
            levStateRef.current = 'idle'
          }
        }
      }
    }

    // 4. Act 4 Permanent Hover & Drift (Props/Lamps)
    if (currentAct === 'act4' && !isGravity && !isFrozen && !isDeleted) {
      if (isSmallObject) {
        g.position.y = position[1] + 2.0 + Math.sin(t * 0.8 + phaseOffset) * 1.0 * driftAmplitude
        const driftX = Math.sin(t * 0.4 + phaseOffset) * 1.2
        const driftZ = Math.cos(t * 0.4 + phaseOffset) * 1.2
        g.position.x = position[0] + driftX
        g.position.z = position[2] + driftZ
        g.rotation.y += dt * driftSpeed * 0.6
        g.rotation.x += dt * driftSpeed * 0.3
        if (Math.random() < 0.005) {
          g.rotation.z += (Math.random() - 0.5) * 1.0
        }
      } else {
        g.position.y = position[1] + Math.sin(t * 1.5 + phaseOffset) * 0.05
      }
    }

    // 5. Act 5 Massive Levitation & Collapse
    if (currentAct === 'act5' && !isGravity && !isFrozen && !isDeleted) {
      if (isLargeObject) {
        const floatHeight = 5.0 + (seedHash % 5) * 2.0
        g.position.y = position[1] + floatHeight + Math.sin(t * 0.3 + phaseOffset) * 1.5 * driftAmplitude
        g.position.x = position[0] + Math.sin(t * 0.15 + phaseOffset) * 2.0
        g.position.z = position[2] + Math.cos(t * 0.15 + phaseOffset) * 2.0
        g.rotation.x = rotation[0] + Math.sin(t * 0.1 + phaseOffset) * 0.12
        g.rotation.z = rotation[2] + Math.cos(t * 0.1 + phaseOffset) * 0.12
        if (Math.random() < 0.002) {
          g.position.x += (Math.random() - 0.5) * 2.5
          g.position.z += (Math.random() - 0.5) * 2.5
        }
      } else if (isSmallObject) {
        g.position.y = position[1] + 4.0 + Math.sin(t * 1.5 + phaseOffset) * 2.5 * driftAmplitude
        g.position.x = position[0] + Math.sin(t * 0.9 + phaseOffset) * 3.0
        g.position.z = position[2] + Math.cos(t * 0.9 + phaseOffset) * 3.0
        g.rotation.y += dt * driftSpeed * 1.5
        g.rotation.x += dt * driftSpeed * 0.8
        if (Math.random() < 0.01) {
          g.position.y += (Math.random() - 0.5) * 0.8
        }
      }
    }

    // 6. Act 5 Object Disappearance System (for static buildings/props/lamps)
    if (currentAct === 'act5' && type !== 'npc' && !isDeleted && !isGravity && !isFrozen) {
      const collapseThreshold = stabilityPercent * 5
      const objectIdNum = seedHash % 100

      if (objectIdNum > collapseThreshold) {
        collapseTimerRef.current += delta
        if (collapseTimerRef.current >= 1.0) {
          fullyHidden.current = true
          g.visible = false
          return
        }

        const shrink = Math.max(0, 1.0 - collapseTimerRef.current)
        g.scale.set(scaleArr[0] * shrink, scaleArr[1] * shrink, scaleArr[2] * shrink)

        _jitter.set(
          (Math.random() - 0.5) * 0.6 * collapseTimerRef.current,
          (Math.random() - 0.5) * 0.6 * collapseTimerRef.current,
          (Math.random() - 0.5) * 0.6 * collapseTimerRef.current
        )
        g.position.x += _jitter.x
        g.position.y += _jitter.y + collapseTimerRef.current * 3.5
        g.position.z += _jitter.z
      }
    }
  })

  if (fullyHidden.current) return null

  return (
    <group ref={groupRef}>
      <group
        ref={innerRef}
        position={position}
        rotation={rotation}
        scale={scaleArr}
      >
        {children}

        {isFrozen && (
          <mesh>
            <boxGeometry args={[1.2, 1.2, 1.2]} />
            <meshBasicMaterial
              color="#00f3ff"
              wireframe
              transparent
              opacity={0.35}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>

      {isCloned && (
        <group
          position={[
            position[0] + cloneOffset[0],
            position[1] + cloneOffset[1],
            position[2] + cloneOffset[2],
          ]}
          rotation={rotation}
          scale={scaleArr}
        >
          {children}
          {/* Glitch wireframe shell to indicate it is a cloned anomaly */}
          <mesh>
            <boxGeometry args={[1.05, 1.05, 1.05]} />
            <meshBasicMaterial
              color="#0ea5e9"
              wireframe
              transparent
              opacity={0.3}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  )
}
