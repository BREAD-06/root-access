import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../../systems/StabilitySystem'
import * as THREE from 'three'

interface DebrisParticle {
  pos: THREE.Vector3
  vel: THREE.Vector3
  rot: THREE.Vector3
  rotSpeed: THREE.Vector3
  scale: THREE.Vector3
  wobbleSpeed: number
  wobbleOffset: number
}

export default function DebrisStorm() {
  const currentAct = useGameStore((state) => state.currentAct)
  const stabilityPercent = useGameStore((state) => state.stabilityPercent)

  const meshRef = useRef<THREE.InstancedMesh>(null)

  // Configure debris counts and base activity by Act
  const isActive = currentAct === 'act3' || currentAct === 'act4' || currentAct === 'act5'
  const maxCount = 250

  // 1. Initialize stable particle parameters
  const particles = useMemo(() => {
    const list: DebrisParticle[] = []
    for (let i = 0; i < maxCount; i++) {
      list.push({
        pos: new THREE.Vector3(
          (Math.random() - 0.5) * 220, // X range
          Math.random() * 80,          // Y range
          (Math.random() - 0.5) * 220  // Z range
        ),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          0.3 + Math.random() * 1.5,   // Vertical drift speed
          (Math.random() - 0.5) * 0.5
        ),
        rot: new THREE.Vector3(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        ),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 1.2,
          (Math.random() - 0.5) * 2.0,
          (Math.random() - 0.5) * 1.2
        ),
        scale: new THREE.Vector3(
          0.3 + Math.random() * 0.8,
          0.3 + Math.random() * 0.8,
          0.3 + Math.random() * 0.8
        ),
        wobbleSpeed: 0.5 + Math.random() * 1.5,
        wobbleOffset: Math.random() * 100
      })
    }
    return list
  }, [])

  // Temporary variables for instance updates
  const tempObject = useMemo(() => new THREE.Object3D(), [])
  const colorList = useMemo(() => ['#00f3ff', '#ff0055', '#a855f7', '#34d399', '#ffffff'].map(c => new THREE.Color(c)), [])

  useFrame((state, delta) => {
    if (!meshRef.current || !isActive) return

    // Scale physics speed based on act/stability
    let speedMult = 1.0
    let currentCount = 0
    let opacity = 0.0

    if (currentAct === 'act3') {
      currentCount = 40
      speedMult = 0.8
      opacity = 0.25
    } else if (currentAct === 'act4') {
      currentCount = 120
      speedMult = 1.4
      opacity = 0.55
    } else if (currentAct === 'act5') {
      currentCount = 250
      speedMult = 2.2
      opacity = 0.85
    }

    const t = state.clock.getElapsedTime()

    // Loop through active instances
    for (let i = 0; i < maxCount; i++) {
      if (i >= currentCount) {
        // Hide inactive particles by setting scale to 0
        tempObject.position.set(0, -999, 0)
        tempObject.scale.set(0, 0, 0)
        tempObject.updateMatrix()
        meshRef.current.setMatrixAt(i, tempObject.matrix)
        continue
      }

      const p = particles[i]

      // Apply vertical drift
      p.pos.y += p.vel.y * delta * speedMult

      // Apply horizontal wind wobble
      const wobble = Math.sin(t * p.wobbleSpeed + p.wobbleOffset) * 0.15 * speedMult
      p.pos.x += wobble * p.vel.x
      p.pos.z += wobble * p.vel.z

      // Reset to ground when particle floats too high
      if (p.pos.y > 85) {
        p.pos.y = -5
        p.pos.x = (Math.random() - 0.5) * 220
        p.pos.z = (Math.random() - 0.5) * 220
      }

      // Continuous rotation
      p.rot.x += p.rotSpeed.x * delta * speedMult
      p.rot.y += p.rotSpeed.y * delta * speedMult
      p.rot.z += p.rotSpeed.z * delta * speedMult

      // Occasional digital position/rotation glitch skips
      if (Math.random() < 0.002 * speedMult) {
        p.pos.x += (Math.random() - 0.5) * 1.5
        p.pos.z += (Math.random() - 0.5) * 1.5
        p.rot.y += (Math.random() - 0.5) * 2.0
      }

      // Configure Object3D matrix
      tempObject.position.copy(p.pos)
      tempObject.rotation.setFromVector3(p.rot)
      
      // Large fragments start appearing in Act 5
      const sizeScale = currentAct === 'act5' ? 2.5 : 1.0
      tempObject.scale.copy(p.scale).multiplyScalar(sizeScale)
      
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)

      // Dynamic color configuration on mount
      if (t < 0.5) {
        const colorIndex = i % colorList.length
        meshRef.current.setColorAt(i, colorList[colorIndex])
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }

    // Mutate material opacity inside R3F loop
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    if (mat) {
      mat.opacity = opacity
      mat.visible = opacity > 0
    }
  })

  if (!isActive) return null

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, maxCount]} castShadow={false} receiveShadow={false}>
      <boxGeometry args={[0.4, 0.4, 0.4]} />
      <meshBasicMaterial 
        transparent 
        wireframe 
        opacity={0} 
        depthWrite={false}
      />
    </instancedMesh>
  )
}
