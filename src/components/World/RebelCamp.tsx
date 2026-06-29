import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { getTerrainHeight } from '../../utils/terrain'

export default function RebelCamp() {
  const yPos = getTerrainHeight(-250, -220)
  
  const fireParticlesRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    // Animate glowing campfire particles (simple rotation/pulsing)
    if (fireParticlesRef.current) {
      fireParticlesRef.current.rotation.y = state.clock.getElapsedTime() * 2
      const scale = 0.95 + Math.sin(state.clock.getElapsedTime() * 12) * 0.08
      fireParticlesRef.current.scale.set(scale, scale, scale)
    }
  })

  return (
    <group position={[-250, yPos, -220]}>
      {/* Campfire Ring (Rocks) */}
      <group>
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2
          const x = Math.sin(angle) * 1.5
          const z = Math.cos(angle) * 1.5
          return (
            <mesh key={i} position={[x, 0.1, z]} castShadow receiveShadow>
              <dodecahedronGeometry args={[0.3, 0]} />
              <meshStandardMaterial color="#475569" roughness={0.8} />
            </mesh>
          )
        })}
      </group>

      {/* Cyber Campfire (Glowing Cyan Streams) */}
      <group ref={fireParticlesRef} position={[0, 0.4, 0]}>
        <mesh castShadow>
          <coneGeometry args={[0.5, 1.2, 5]} />
          <meshBasicMaterial color="#00f3ff" wireframe />
        </mesh>
        {/* Inner core */}
        <mesh position={[0, 0.1, 0]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial color="#00f3ff" emissive="#06b6d4" emissiveIntensity={4} />
        </mesh>
        <pointLight position={[0, 0.5, 0]} color="#00f3ff" intensity={3} distance={15} />
      </group>

      {/* Rebel Cargo Tents & Fences */}
      <RigidBody type="fixed" colliders="cuboid">
        {/* Tent 1 (Cyan/grey frame) */}
        <mesh position={[-4, 1.5, -2]} rotation={[0, 0.6, 0]} castShadow receiveShadow>
          <coneGeometry args={[2.5, 3.0, 4]} />
          <meshStandardMaterial color="#334155" roughness={0.9} flatShading />
        </mesh>
        
        {/* Tent 2 (Darker grey) */}
        <mesh position={[3, 1.2, 3]} rotation={[0, -0.4, 0]} castShadow receiveShadow>
          <coneGeometry args={[2.0, 2.4, 4]} />
          <meshStandardMaterial color="#1e293b" roughness={0.9} flatShading />
        </mesh>

        {/* Rusty Cargo Containers */}
        <mesh position={[-3, 1, 4]} rotation={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[2, 2, 4]} />
          <meshStandardMaterial color="#78350f" metalness={0.7} roughness={0.5} />
        </mesh>

        <mesh position={[4, 0.6, -3]} rotation={[0, -0.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 1.2, 2.5]} />
          <meshStandardMaterial color="#3b4252" metalness={0.8} roughness={0.4} />
        </mesh>

        {/* Cyber terminal stand */}
        <group position={[-1.2, 0.5, -3]} rotation={[0, 0.3, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.8, 1, 0.8]} />
            <meshStandardMaterial color="#2e3440" />
          </mesh>
          <mesh position={[0, 0.5, 0.1]} rotation={[-0.3, 0, 0]}>
            <planeGeometry args={[0.7, 0.5]} />
            <meshStandardMaterial color="#00f3ff" emissive="#06b6d4" emissiveIntensity={1.5} />
          </mesh>
        </group>
      </RigidBody>

      {/* Floating Camp HUD label */}
      <Html position={[0, 3.2, 0]} center>
        <div className="flex flex-col items-center font-mono pointer-events-none select-none">
          <div className="px-2.5 py-1 bg-teal-950/95 border border-teal-500 rounded text-[8px] text-teal-400 font-bold whitespace-nowrap shadow-[0_0_12px_rgba(20,184,166,0.4)]">
            REBEL CAMP
          </div>
        </div>
      </Html>
    </group>
  )
}
