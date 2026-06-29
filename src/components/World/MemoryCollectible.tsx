import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Vector3 } from 'three'
import { useGameStore } from '../../systems/StabilitySystem'
import { playSuccessSound } from '../../utils/sound'
import { getTerrainHeight } from '../../utils/terrain'

export default function MemoryCollectible() {
  const [collected, setCollected] = useState(false)
  const findMemoryFragment = useGameStore((s) => s.findMemoryFragment)
  const showDialogue = useGameStore((s) => s.showDialogue)

  const pos = useRef(new Vector3(-320, getTerrainHeight(-320, 180) + 1.2, 180))
  const meshRef = useRef<any>(null)

  useFrame((state) => {
    if (collected) return

    // Bobbing and rotation animation
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 1.5
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.5
      meshRef.current.position.y = pos.current.y + Math.sin(state.clock.getElapsedTime() * 2) * 0.25
    }

    // Check player distance
    const playerPos = (window as any).__playerPosition as Vector3 | undefined
    if (playerPos) {
      const dist = playerPos.distanceTo(pos.current)
      if (dist < 3.8) {
        setCollected(true)
        playSuccessSound()
        findMemoryFragment()
        
        // Show lore text dialog
        showDialogue([
          '[SYSTEM]: MEMORY STACK FRAGMENT DECRYPTED.',
          '[RECOLLECTION // PROTOCOL_AYUSHMAN]:',
          '"I remember the office... the white fluorescent lights... the Architect saying we succeeded."',
          '"We mapped our brain synapses onto the silicon array. It worked. We were the first citizens."',
          '[SYSTEM]: SYSTEM INTEGRITY RESTORED (+10%).'
        ])
      }
    }
  })

  if (collected) return null

  return (
    <group position={[-320, pos.current.y, 180]}>
      {/* Visual Floating Shard */}
      <mesh ref={meshRef} castShadow>
        <octahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial 
          color="#06b6d4" 
          emissive="#0891b2" 
          emissiveIntensity={2.5} 
          metalness={0.9} 
          roughness={0.1} 
        />
      </mesh>
      
      {/* Pulsing light */}
      <pointLight color="#06b6d4" intensity={2} distance={8} />

      {/* Floating HUD tag */}
      <Html position={[0, 1.4, 0]} center>
        <div className="flex flex-col items-center font-mono pointer-events-none select-none">
          <div className="px-2.5 py-1 bg-cyan-950/95 border border-cyan-500 rounded text-[8px] text-cyan-400 font-bold whitespace-nowrap shadow-[0_0_12px_rgba(6,182,212,0.4)] animate-pulse">
            MEMORY STACK
          </div>
        </div>
      </Html>
    </group>
  )
}
