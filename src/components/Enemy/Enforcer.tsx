import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { Group } from 'three'
import { useGameStore } from '../../systems/StabilitySystem'
import WorldObject from '../World/WorldObject'

interface EnforcerProps {
  id: string
  startPosition: [number, number, number]
  playerPos: React.MutableRefObject<Vector3>
}

export default function Enforcer({ id, startPosition, playerPos }: EnforcerProps) {
  const isDeleted = useGameStore((s) => s.worldMutations[`delete:${id}`])
  const isFrozen = useGameStore((s) => s.worldMutations[`freeze:${id}`])
  const takeDamage = useGameStore((s) => s.takeDamage)
  const isConsoleOpen = useGameStore((s) => s.isConsoleOpen)
  
  const groupRef = useRef<Group>(null)
  const currentPos = useRef(new Vector3(...startPosition))
  const attackCooldown = useRef(0)
  
  const laserRef = useRef<Group>(null)

  useFrame((_, delta) => {
    if (isDeleted || isFrozen || !groupRef.current) return
    
    // Bullet time
    const dt = isConsoleOpen ? delta * 0.05 : delta
    
    // 1. Move towards player (but keep some distance, say 15 units)
    const dist = currentPos.current.distanceTo(playerPos.current)
    if (dist > 15) {
      const dir = new Vector3().copy(playerPos.current).sub(currentPos.current).normalize()
      currentPos.current.addScaledVector(dir, 5 * dt) // speed 5
      
      // Hover effect - maintain a height above the player rather than sticking to startPosition
      const targetHeight = Math.max(playerPos.current.y + 6, 8)
      currentPos.current.y = targetHeight + Math.sin(Date.now() * 0.002) * 1.5
    }
    
    groupRef.current.position.copy(currentPos.current)
    groupRef.current.lookAt(playerPos.current)
    
    // 2. Attack logic
    if (attackCooldown.current > 0) {
      attackCooldown.current -= dt
      if (laserRef.current) {
        laserRef.current.visible = attackCooldown.current > 1.8 // show laser for 0.2s
      }
    } else if (dist < 30) {
      // Fire!
      attackCooldown.current = 2.0 // 2 seconds cooldown
      takeDamage(10) // 10 damage
    }
  })

  if (isDeleted) {
    // We let WorldObject handle the shrink/delete animation, 
    // but we stop the logic above.
  }

  return (
    <group ref={groupRef}>
      <WorldObject name={id} type="prop" position={[0, 0, 0]}>
        <mesh>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Eye */}
        <mesh position={[0, 0, 0.9]}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
        </mesh>
        
        {/* Laser Beam (starts hidden) */}
        <mesh ref={laserRef} position={[0, 0, 15]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
          <cylinderGeometry args={[0.05, 0.05, 30]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
        </mesh>
      </WorldObject>
    </group>
  )
}
