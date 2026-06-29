import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, ConeCollider, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { useGameStore } from '../../systems/StabilitySystem'
import InteractableTerminal from '../../components/World/InteractableTerminal'
import { getTerrainHeight } from '../../utils/terrain'

// Seedable random number generator for deterministic vegetation placements
function seedRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// Procedural Multi-texture Ground Shader
const TerrainShader = {
  uniforms: {
    uTime: { value: 0 },
    uStability: { value: 1.0 },
    uFogColor: { value: new THREE.Color('#030712') }
  },
  vertexShader: `
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    void main() {
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      vNormal = normalMatrix * normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uStability;
    uniform vec3 uFogColor;
    varying vec3 vWorldPos;
    varying vec3 vNormal;

    void main() {
      float r = length(vWorldPos.xz);
      
      // Cyber asphalt floor inside city, grass and dirt outside
      vec3 cityBase = vec3(0.09, 0.11, 0.14); // Slate slate
      vec3 grassBase = vec3(0.08, 0.28, 0.15); // Vibrant forest green
      vec3 dirtBase = vec3(0.35, 0.22, 0.12); // Warm brown dirt trail
      vec3 rockBase = vec3(0.22, 0.25, 0.29); // Slate rocky grey

      // Cyber city gridlines
      float grid = 0.0;
      if (r < 95.0) {
        float gridX = step(0.975, fract(vWorldPos.x / 20.0));
        float gridZ = step(0.975, fract(vWorldPos.z / 20.0));
        grid = max(gridX, gridZ) * 0.35;
      }
      vec3 finalColor = cityBase + vec3(0.0, 0.95, 1.0) * grid;

      if (r >= 95.0) {
        float slope = 1.0 - vNormal.y; // 0 = flat, 1 = cliff
        
        // Pseudo-random noise for dirt trails
        float noise = sin(vWorldPos.x * 0.08) * cos(vWorldPos.z * 0.08) * 0.5 + 0.5;
        
        vec3 forestColor = mix(grassBase, dirtBase, noise * 0.55);
        forestColor = mix(forestColor, rockBase, step(0.18, slope) * 0.6);
        
        // Smooth transition from city grid to organic forest floor
        float blend = min(1.0, (r - 95.0) / 18.0);
        finalColor = mix(finalColor, forestColor, blend);
      }

      // Red/Cyan digital scanning glitch lines based on stability collapse
      if (uStability < 0.85) {
        float glitchBand = step(0.982, sin(vWorldPos.x * 0.04 + uTime * 4.0) * cos(vWorldPos.z * 0.04 - uTime * 1.5));
        vec3 glitchColor = vec3(0.95, 0.0, 0.3) * glitchBand * (1.0 - uStability) * 1.8;
        finalColor += glitchColor;
      }

      // Blend distant terrain into active environment fog color
      float depth = length(vWorldPos.xz);
      float fogFactor = smoothstep(220.0, 520.0, depth);
      finalColor = mix(finalColor, uFogColor, fogFactor * 0.85);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
}

export default function OpenWorldExpansion() {
  const currentAct = useGameStore((s) => s.currentAct)
  const stabilityPercent = useGameStore((s) => s.stabilityPercent)
  const timeOfDay = useGameStore((s) => s.timeOfDay)

  // Instanced refs for optimized rendering
  const pineTrunkRef = useRef<THREE.InstancedMesh>(null)
  const pineLeavesRef = useRef<THREE.InstancedMesh>(null)
  
  const oakTrunkRef = useRef<THREE.InstancedMesh>(null)
  const oakLeavesRef = useRef<THREE.InstancedMesh>(null)

  const bushRef = useRef<THREE.InstancedMesh>(null)
  const logRef = useRef<THREE.InstancedMesh>(null)
  const rockRef = useRef<THREE.InstancedMesh>(null)
  const flowerRef = useRef<THREE.InstancedMesh>(null)

  const terrainMatRef = useRef<THREE.ShaderMaterial>(null)
  const pineFoliageMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const oakFoliageMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const boundaryCylinderRef = useRef<THREE.Mesh>(null)

  // 1. Generate Deterministic Coordinate Lists for all foliage types
  const { pineTrees, oakTrees, bushes, logs, rocks, flowers } = useMemo(() => {
    const pineList: { x: number; z: number; scale: number; rotationY: number }[] = []
    const oakList: { x: number; z: number; scale: number; rotationY: number }[] = []
    const bushList: { x: number; z: number; scale: number }[] = []
    const logList: { x: number; z: number; scale: number; rotationY: number }[] = []
    const rockList: { x: number; z: number; scale: [number, number, number]; rotationY: number }[] = []
    const flowerList: { x: number; z: number; scale: number; colorIndex: number }[] = []

    let seed = 200

    for (let i = 0; i < 2800; i++) {
      const x = (seedRandom(seed++) - 0.5) * 960 // [-480, 480]
      const z = (seedRandom(seed++) - 0.5) * 960 // [-480, 480]
      
      const dist = Math.sqrt(x * x + z * z)

      // Forest placement checks
      if (dist < 105 || dist > 450) continue
      
      const lakeDist = Math.sqrt((x - 170) ** 2 + (z + 170) ** 2)
      if (lakeDist < 78) continue

      const outpostDist = Math.sqrt((x + 200) ** 2 + (z + 250) ** 2)
      if (outpostDist < 48) continue

      const backdoorDist = Math.sqrt((x - 300) ** 2 + (z + 260) ** 2)
      if (backdoorDist < 20) continue

      const scale = 0.65 + seedRandom(seed++) * 0.8
      const rotationY = seedRandom(seed++) * Math.PI * 2
      const spawnType = seedRandom(seed++)

      if (spawnType < 0.28) {
        // Pine trees in colder eastern/northern arcs
        if (x > -150) {
          pineList.push({ x, z, scale, rotationY })
        } else {
          oakList.push({ x, z, scale: scale * 1.15, rotationY })
        }
      } else if (spawnType < 0.48) {
        // Lush Oak trees
        oakList.push({ x, z, scale: scale * 1.1, rotationY })
      } else if (spawnType < 0.68) {
        // Bushes
        bushList.push({ x, z, scale: 0.8 + seedRandom(seed++) * 0.9 })
      } else if (spawnType < 0.76) {
        // Fallen Logs
        logList.push({ x, z, scale: 0.9 + seedRandom(seed++) * 0.6, rotationY })
      } else if (spawnType < 0.86) {
        // Shard Rocks
        rockList.push({
          x,
          z,
          scale: [0.7 + seedRandom(seed++) * 1.6, 0.7 + seedRandom(seed++) * 2.2, 0.7 + seedRandom(seed++) * 1.6],
          rotationY,
        })
      } else {
        // Wild flowers
        flowerList.push({
          x,
          z,
          scale: 0.4 + seedRandom(seed++) * 0.6,
          colorIndex: Math.floor(seedRandom(seed++) * 3)
        })
      }
    }

    return {
      pineTrees: pineList.slice(0, 400),
      oakTrees: oakList.slice(0, 350),
      bushes: bushList.slice(0, 300),
      logs: logList.slice(0, 150),
      rocks: rockList.slice(0, 200),
      flowers: flowerList.slice(0, 300)
    }
  }, [])

  // Generate terrain geometry buffers immediately during render for Rapier trimesh collision mapping
  const { terrainPositions, terrainIndices } = useMemo(() => {
    const width = 1200
    const height = 1200
    const segs = 128
    const vertexCount = (segs + 1) * (segs + 1)
    
    const posArray = new Float32Array(vertexCount * 3)
    const indexArray = []
    
    let idx = 0
    for (let z = 0; z <= segs; z++) {
      for (let x = 0; x <= segs; x++) {
        const vx = (x / segs - 0.5) * width
        const vz = (z / segs - 0.5) * height
        const vy = getTerrainHeight(vx, vz)
        
        posArray[idx * 3] = vx
        posArray[idx * 3 + 1] = vy
        posArray[idx * 3 + 2] = vz
        idx++
      }
    }
    
    for (let z = 0; z < segs; z++) {
      for (let x = 0; x < segs; x++) {
        const row1 = z * (segs + 1)
        const row2 = (z + 1) * (segs + 1)
        
        indexArray.push(row1 + x, row2 + x, row1 + x + 1)
        indexArray.push(row1 + x + 1, row2 + x, row2 + x + 1)
      }
    }
    
    return {
      terrainPositions: posArray,
      terrainIndices: new Uint32Array(indexArray)
    }
  }, [])

  // 3. Position static non-glitch elements once on load
  useEffect(() => {
    const tempObj = new THREE.Object3D()

    // Logs
    if (logRef.current) {
      logs.forEach((l, idx) => {
        const y = getTerrainHeight(l.x, l.z) - 0.1
        tempObj.position.set(l.x, y, l.z)
        tempObj.scale.set(l.scale * 0.4, l.scale * 0.4, l.scale * 3.5)
        tempObj.rotation.set(0, l.rotationY, Math.PI / 2) // lie flat
        tempObj.updateMatrix()
        logRef.current!.setMatrixAt(idx, tempObj.matrix)
      })
      logRef.current.instanceMatrix.needsUpdate = true
    }

    // Rocks
    if (rockRef.current) {
      rocks.forEach((r, idx) => {
        const y = getTerrainHeight(r.x, r.z) - 0.2
        tempObj.position.set(r.x, y, r.z)
        tempObj.scale.set(r.scale[0], r.scale[1], r.scale[2])
        tempObj.rotation.set(0, r.rotationY, 0)
        tempObj.updateMatrix()
        rockRef.current!.setMatrixAt(idx, tempObj.matrix)
      })
      rockRef.current.instanceMatrix.needsUpdate = true
    }

    // Wild Flowers
    if (flowerRef.current) {
      const colors = [
        new THREE.Color('#ec4899'), // pink
        new THREE.Color('#38bdf8'), // sky blue
        new THREE.Color('#c084fc'), // purple
      ]
      flowers.forEach((f, idx) => {
        const y = getTerrainHeight(f.x, f.z)
        tempObj.position.set(f.x, y, f.z)
        tempObj.scale.set(f.scale * 0.5, f.scale * 0.5, f.scale * 0.5)
        tempObj.rotation.set(0, 0, 0)
        tempObj.updateMatrix()
        flowerRef.current!.setMatrixAt(idx, tempObj.matrix)
        flowerRef.current!.setColorAt(idx, colors[f.colorIndex])
      })
      flowerRef.current.instanceMatrix.needsUpdate = true
      if (flowerRef.current.instanceColor) {
        flowerRef.current.instanceColor.needsUpdate = true
      }
    }
  }, [logs, rocks, flowers])

  // 4. Animate floating and color-shifting glitch routines in the frame loop
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime()
    const isGlitching = stabilityPercent < 60
    const glitchFactor = isGlitching ? (60 - stabilityPercent) / 60 : 0
    const tempObj = new THREE.Object3D()

    // Dynamic Shader Uniform Updates
    if (terrainMatRef.current) {
      terrainMatRef.current.uniforms.uTime.value = t
      terrainMatRef.current.uniforms.uStability.value = stabilityPercent / 100
      terrainMatRef.current.uniforms.uFogColor.value.set(fogColor)
    }

    // Foliage Color Shift (Green -> Neon Cyber Purple)
    const baseLeavesColor = new THREE.Color('#155e37')
    const glitchLeavesColor = new THREE.Color('#d946ef')
    const activeLeavesColor = baseLeavesColor.clone().lerp(glitchLeavesColor, glitchFactor)
    
    if (pineFoliageMatRef.current) {
      pineFoliageMatRef.current.color.copy(activeLeavesColor)
      pineFoliageMatRef.current.emissive.copy(glitchLeavesColor)
      pineFoliageMatRef.current.emissiveIntensity = glitchFactor * 1.5
    }

    if (oakFoliageMatRef.current) {
      oakFoliageMatRef.current.color.copy(activeLeavesColor)
      oakFoliageMatRef.current.emissive.copy(glitchLeavesColor)
      oakFoliageMatRef.current.emissiveIntensity = glitchFactor * 1.5
    }

    // Animate Pine Trees (some float up when glitching)
    if (pineTrunkRef.current && pineLeavesRef.current) {
      pineTrees.forEach((p, idx) => {
        let y = getTerrainHeight(p.x, p.z)
        let rotX = 0
        
        if (isGlitching && idx % 10 === 0) {
          // Levitate
          y += 2.5 + Math.sin(t * 0.8 + idx) * 1.2 * glitchFactor
          rotX = Math.sin(t * 2.0 + idx) * 0.15 * glitchFactor
        }

        // Trunk
        tempObj.position.set(p.x, y + p.scale * 1.1, p.z)
        tempObj.scale.set(p.scale * 0.35, p.scale * 2.2, p.scale * 0.35)
        tempObj.rotation.set(rotX, p.rotationY, 0)
        tempObj.updateMatrix()
        pineTrunkRef.current!.setMatrixAt(idx, tempObj.matrix)

        // Foliage (Pine shape: cascade of 3 cones)
        tempObj.position.set(p.x, y + p.scale * 2.0, p.z)
        tempObj.scale.set(p.scale * 1.8, p.scale * 2.6, p.scale * 1.8)
        tempObj.rotation.set(rotX, p.rotationY, 0)
        tempObj.updateMatrix()
        pineLeavesRef.current!.setMatrixAt(idx, tempObj.matrix)
      })
      pineTrunkRef.current.instanceMatrix.needsUpdate = true
      pineLeavesRef.current.instanceMatrix.needsUpdate = true
    }

    // Animate Oak Trees (some float/spin when glitching)
    if (oakTrunkRef.current && oakLeavesRef.current) {
      oakTrees.forEach((o, idx) => {
        let y = getTerrainHeight(o.x, o.z)
        let rotY = o.rotationY
        let rotZ = 0

        if (isGlitching && idx % 12 === 0) {
          y += 3.2 + Math.sin(t * 0.6 + idx) * 1.6 * glitchFactor
          rotY += t * 1.5 * glitchFactor
          rotZ = Math.cos(t * 1.8 + idx) * 0.12 * glitchFactor
        }

        // Trunk
        tempObj.position.set(o.x, y + o.scale * 1.2, o.z)
        tempObj.scale.set(o.scale * 0.45, o.scale * 2.4, o.scale * 0.45)
        tempObj.rotation.set(0, rotY, rotZ)
        tempObj.updateMatrix()
        oakTrunkRef.current!.setMatrixAt(idx, tempObj.matrix)

        // Dense bulbous leaves
        tempObj.position.set(o.x, y + o.scale * 2.8, o.z)
        tempObj.scale.set(o.scale * 2.3, o.scale * 2.0, o.scale * 2.3)
        tempObj.rotation.set(0, rotY, rotZ)
        tempObj.updateMatrix()
        oakLeavesRef.current!.setMatrixAt(idx, tempObj.matrix)
      })
      oakTrunkRef.current.instanceMatrix.needsUpdate = true
      oakLeavesRef.current.instanceMatrix.needsUpdate = true
    }

    // Animate Bushes
    if (bushRef.current) {
      bushes.forEach((b, idx) => {
        let y = getTerrainHeight(b.x, b.z)
        if (isGlitching && idx % 15 === 0) {
          y += 1.5 + Math.sin(t * 1.2 + idx) * 0.6 * glitchFactor
        }
        tempObj.position.set(b.x, y + b.scale * 0.4, b.z)
        tempObj.scale.set(b.scale * 1.5, b.scale * 1.0, b.scale * 1.5)
        tempObj.rotation.set(0, 0, 0)
        tempObj.updateMatrix()
        bushRef.current!.setMatrixAt(idx, tempObj.matrix)
      })
      bushRef.current.instanceMatrix.needsUpdate = true
    }

    // Rotate distant sky cylinder
    if (boundaryCylinderRef.current) {
      boundaryCylinderRef.current.rotation.y += delta * 0.004
    }
  })

  // 5. Horizon Mountains ring (Procedural placement + rapier colliders)
  const mountains = useMemo(() => {
    const list: { id: string; pos: [number, number, number]; r: number; h: number; rotY: number }[] = []
    let seed = 800
    const count = 48
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const r = 460 + seedRandom(seed++) * 40
      const x = Math.sin(angle) * r
      const z = Math.cos(angle) * r
      const h = 55 + seedRandom(seed++) * 45
      const mRadius = 45 + seedRandom(seed++) * 25

      list.push({
        id: `mountain_range_${i}`,
        pos: [x, h / 2 - 3, z],
        r: mRadius,
        h,
        rotY: seedRandom(seed++) * Math.PI * 2
      })
    }
    return list
  }, [])

  // 6. Dynamic active act fog color matching
  const fogColor = useMemo(() => {
    if (currentAct === 'act3') return '#35124c'
    if (currentAct === 'act4') return '#1c1c1f'
    if (currentAct === 'act5') return '#14031d'
    
    // Lerp sunset to twilight in Act 1 & 2
    const t = timeOfDay
    const sunset = new THREE.Color('#fdba74')
    const twilight = new THREE.Color('#35124c')
    const night = new THREE.Color('#030712')
    const c = new THREE.Color()
    if (t < 0.45) {
      c.copy(sunset).lerp(twilight, t / 0.45)
    } else {
      c.copy(twilight).lerp(night, (t - 0.45) / 0.55)
    }
    return `#${c.getHexString()}`
  }, [currentAct, timeOfDay])

  return (
    <group>
      {/* 1. Procedural Height Displaced Terrain Mesh with Rapier Trimesh collisions */}
      <RigidBody type="fixed" colliders="trimesh">
        <mesh receiveShadow>
          <bufferGeometry onUpdate={(self) => self.computeVertexNormals()}>
            <bufferAttribute 
              attach="attributes-position" 
              args={[terrainPositions, 3]} 
            />
            <bufferAttribute 
              attach="index" 
              args={[terrainIndices, 1]} 
            />
          </bufferGeometry>
          <shaderMaterial 
            ref={terrainMatRef} 
            args={[TerrainShader]} 
            shadowSide={THREE.DoubleSide} 
          />
        </mesh>
      </RigidBody>

      {/* 2. Instanced Pine Trees (Trunk and Cascading Leaves) */}
      <instancedMesh ref={pineTrunkRef} args={[null as any, null as any, pineTrees.length]} castShadow>
        <cylinderGeometry args={[0.3, 0.4, 1, 6]} />
        <meshStandardMaterial color="#3e2723" roughness={0.9} />
      </instancedMesh>

      <instancedMesh ref={pineLeavesRef} args={[null as any, null as any, pineTrees.length]} castShadow>
        <coneGeometry args={[1, 1.6, 5]} />
        <meshStandardMaterial 
          ref={pineFoliageMatRef} 
          color="#155e37" 
          roughness={0.75} 
        />
      </instancedMesh>

      {/* 3. Instanced Oak Trees (Gnarled trunk and bulbous leaves) */}
      <instancedMesh ref={oakTrunkRef} args={[null as any, null as any, oakTrees.length]} castShadow>
        <cylinderGeometry args={[0.4, 0.6, 1, 8]} />
        <meshStandardMaterial color="#4e342e" roughness={0.92} />
      </instancedMesh>

      <instancedMesh ref={oakLeavesRef} args={[null as any, null as any, oakTrees.length]} castShadow>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial 
          ref={oakFoliageMatRef} 
          color="#1b4d3e" 
          roughness={0.65} 
        />
      </instancedMesh>

      {/* 4. Instanced Bushes */}
      <instancedMesh ref={bushRef} args={[null as any, null as any, bushes.length]} castShadow>
        <dodecahedronGeometry args={[0.8, 1]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.7} />
      </instancedMesh>

      {/* 5. Instanced Fallen Logs */}
      <instancedMesh ref={logRef} args={[null as any, null as any, logs.length]} castShadow receiveShadow>
        <cylinderGeometry args={[0.4, 0.4, 1, 6]} />
        <meshStandardMaterial color="#3e2723" roughness={0.8} />
      </instancedMesh>

      {/* 6. Instanced Rocks */}
      <instancedMesh ref={rockRef} args={[null as any, null as any, rocks.length]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#455a64" roughness={0.9} />
      </instancedMesh>

      {/* 7. Instanced Wild Flowers (Pink/Blue/Purple dots) */}
      <instancedMesh ref={flowerRef} args={[null as any, null as any, flowers.length]}>
        <sphereGeometry args={[0.2, 5, 4]} />
        <meshBasicMaterial color="#ec4899" /> {/* Pink default */}
      </instancedMesh>

      {/* 8. Glowing Digital Lake */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[170, 0.1, -170]} receiveShadow>
        <planeGeometry args={[130, 130]} />
        <meshStandardMaterial 
          color="#06b6d4" 
          transparent 
          opacity={0.65} 
          roughness={0.05} 
          metalness={0.95} 
          emissive="#0891b2" 
          emissiveIntensity={1.2} 
        />
      </mesh>

      {/* Lake Cyber-Bridge */}
      <RigidBody type="fixed" position={[170, 0.8, -170]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[6, 0.4, 30]} />
          <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[-3, 0.6, 0]}>
          <boxGeometry args={[0.1, 0.8, 30]} />
          <meshBasicMaterial color="#00f3ff" />
        </mesh>
        <mesh position={[3, 0.6, 0]}>
          <boxGeometry args={[0.1, 0.8, 30]} />
          <meshBasicMaterial color="#00f3ff" />
        </mesh>
      </RigidBody>

      {/* 9. Mountain Range Boundary Colliders & Visual Cones */}
      {mountains.map((m) => (
        <group key={m.id} position={m.pos} rotation={[0, m.rotY, 0]}>
          <RigidBody type="fixed" colliders={false}>
            <mesh castShadow receiveShadow>
              <coneGeometry args={[m.r, m.h, 5]} />
              <meshStandardMaterial color="#1e293b" roughness={0.95} metalness={0.05} />
            </mesh>
            <ConeCollider args={[m.h / 2, m.r]} position={[0, 0, 0]} friction={0.5} />
          </RigidBody>
        </group>
      ))}

      {/* 10. Distant Fog-Covered Sky Cylinder */}
      <mesh ref={boundaryCylinderRef} position={[0, 40, 0]}>
        <cylinderGeometry args={[570, 570, 260, 32, 1, true]} />
        <meshBasicMaterial 
          color={fogColor} 
          side={THREE.DoubleSide} 
          transparent 
          opacity={0.9} 
          depthWrite={false}
        />
      </mesh>

      {/* 11. Hidden Exploration Backdoor Terminal Node */}
      <InteractableTerminal 
        position={[300, getTerrainHeight(300, -260), -260]} 
        name="architect_backdoor" 
      />
    </group>
  )
}
