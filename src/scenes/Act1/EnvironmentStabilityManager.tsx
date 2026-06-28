import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import { useGameStore } from '../../systems/StabilitySystem'
import * as THREE from 'three'

/**
 * EnvironmentStabilityManager handles dynamic sky, fog, and weather adjustments
 * based on the simulation stability level, active Act, and the sunset-to-night progression.
 */
export default function EnvironmentStabilityManager() {
  const currentAct = useGameStore((state) => state.currentAct)
  const timeOfDay = useGameStore((state) => state.timeOfDay)

  const cracksRef = useRef<THREE.Mesh>(null)
  const timeRef = useRef(0)

  // Stable random star positions
  const starPositions = useMemo(() => {
    const arr = new Float32Array(1500) // 500 stars
    for (let i = 0; i < 500; i++) {
      const r = 380 // sphere radius
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      const y = Math.abs(r * Math.cos(phi)) // upper hemisphere only
      const x = r * Math.sin(phi) * Math.cos(theta)
      const z = r * Math.sin(phi) * Math.sin(theta)
      arr.set([x, y, z], i * 3)
    }
    return arr
  }, [])

  // Dynamic values that will be lerped
  const targetFogColor = useMemo(() => new THREE.Color(), [])
  const currentFogColor = useMemo(() => new THREE.Color('#fdba74'), []) // starts peach
  const targetFogRange = useRef<[number, number]>([80, 220])
  const currentFogRange = useRef<[number, number]>([80, 220])

  // Sky settings
  const skyParams = useMemo(() => {
    // Act 1 & 2: Dynamic Sunset-to-Night transition
    if (currentAct === 'act1' || currentAct === 'act2') {
      const t = timeOfDay
      const sunY = 15 - t * 45 // descends from 15 to -30
      
      let rayleigh = 0.5
      if (t < 0.45) {
        rayleigh = 0.5 + (t / 0.45) * 5.5 // peaks at 6.0 at twilight
      } else if (t < 0.75) {
        rayleigh = 6.0 - ((t - 0.45) / 0.3) * 6.0
      } else {
        rayleigh = 0
      }
      
      const turbidity = 2 + Math.min(1.0, t / 0.5) * 6 // 2 to 8
      
      let positionY = sunY
      if (currentAct === 'act2' && t < 0.5) {
        positionY = Math.min(positionY, 6) // act 2 slight depression
      }

      return {
        sunPosition: [100, positionY, 100] as [number, number, number],
        rayleigh,
        turbidity
      }
    }

    // Act 3 onwards: Standard act-based parameters
    switch (currentAct) {
      case 'act3':
        return { sunPosition: [100, -2, 100] as [number, number, number], rayleigh: 4, turbidity: 5 }
      case 'act4':
        return { sunPosition: [100, -10, 100] as [number, number, number], rayleigh: 0.1, turbidity: 8 }
      case 'act5':
        return { sunPosition: [0, -100, 0] as [number, number, number], rayleigh: 0, turbidity: 10 }
      default: // prologue
        return { sunPosition: [100, 15, 100] as [number, number, number], rayleigh: 0.5, turbidity: 2 }
    }
  }, [currentAct, timeOfDay])

  useFrame((_, delta) => {
    timeRef.current += delta

    // 1. Progress time of day in Act 1/2
    if (timeOfDay < 1.0 && (currentAct === 'act1' || currentAct === 'act2')) {
      const storeState = useGameStore.getState()
      useGameStore.setState({
        timeOfDay: Math.min(1.0, timeOfDay + (delta / 360) * storeState.timeMultiplier)
      })
    }

    // 2. Calculate Target Fog properties
    let fc = '#c8e0ff'
    let range: [number, number] = [80, 220]

    if (currentAct === 'act1' || currentAct === 'act2') {
      const t = timeOfDay
      const sunsetFog = new THREE.Color('#fdba74') // warm sunset peach
      const duskFog = new THREE.Color('#35124c')   // twilight deep purple
      const nightFog = new THREE.Color('#030712')  // deep black-blue
      
      const c = new THREE.Color()
      if (t < 0.45) {
        c.copy(sunsetFog).lerp(duskFog, t / 0.45)
      } else {
        c.copy(duskFog).lerp(nightFog, (t - 0.45) / 0.55)
      }
      fc = `#${c.getHexString()}`
      range = [
        THREE.MathUtils.lerp(80, 45, t),
        THREE.MathUtils.lerp(220, 130, t)
      ]
    } else if (currentAct === 'act3') {
      fc = '#35124c'
      range = [50, 150]
    } else if (currentAct === 'act4') {
      fc = '#1c1c1f'
      range = [30, 110]
    } else if (currentAct === 'act5') {
      const cycle = Math.sin(timeRef.current * 0.5)
      if (cycle < -0.3) {
        fc = '#051b07'
      } else if (cycle > 0.3) {
        fc = '#1c0303'
      } else {
        fc = '#14031d'
      }
      range = [15, 75]
    }

    targetFogColor.set(fc)
    targetFogRange.current = range

    // Lerp fog color & range
    currentFogColor.lerp(targetFogColor, delta * 2)
    currentFogRange.current[0] += (targetFogRange.current[0] - currentFogRange.current[0]) * delta * 2
    currentFogRange.current[1] += (targetFogRange.current[1] - currentFogRange.current[1]) * delta * 2

    // Animate Sky Cracks
    if (cracksRef.current) {
      cracksRef.current.rotation.y = timeRef.current * 0.05
      cracksRef.current.rotation.z = timeRef.current * 0.02
    }
  })

  // Pulsing opacity for sky cracks (Act 4/5)
  const crackOpacity = useMemo(() => {
    if (currentAct === 'act4') return 0.25
    if (currentAct === 'act5') return 0.55
    return 0
  }, [currentAct])

  // Stars opacity: fades in after twilight (t > 0.45)
  const starOpacity = useMemo(() => {
    if (currentAct === 'act3') return 0.20
    if (currentAct === 'act4') return 0.05
    if (currentAct === 'act5') return 0.0
    return Math.max(0, Math.min(1.0, (timeOfDay - 0.45) / 0.45))
  }, [currentAct, timeOfDay])

  const isAct5 = currentAct === 'act5'
  const moonY = -35 + timeOfDay * 95
  const moonPos: [number, number, number] = [-80, moonY, -100]

  return (
    <>
      {/* Dynamic Fog */}
      <fog
        attach="fog"
        args={[
          `rgb(${Math.round(currentFogColor.r * 255)}, ${Math.round(currentFogColor.g * 255)}, ${Math.round(
            currentFogColor.b * 255
          )})`,
          currentFogRange.current[0],
          currentFogRange.current[1],
        ]}
      />

      {/* R3F Sky - active for Acts 1-4 */}
      {!isAct5 && (
        <Sky
          distance={450000}
          sunPosition={skyParams.sunPosition}
          rayleigh={skyParams.rayleigh}
          turbidity={skyParams.turbidity}
        />
      )}

      {/* Night Sky Dome (Act 1 & 2 twilight transition to night) */}
      {(currentAct === 'act1' || currentAct === 'act2') && timeOfDay > 0.5 && (
        <mesh scale={[-1, 1, 1]}>
          <sphereGeometry args={[450, 16, 16]} />
          <meshBasicMaterial
            color="#050a18"
            side={THREE.BackSide}
            transparent
            opacity={Math.max(0, Math.min(1.0, (timeOfDay - 0.5) / 0.3))}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Stars (fade in as night falls) */}
      {starOpacity > 0 && (
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[starPositions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            color="#ffffff"
            size={1.2}
            sizeAttenuation={false}
            transparent
            opacity={starOpacity}
            depthWrite={false}
          />
        </points>
      )}

      {/* Glowing Moon (Act 1 & 2, rises as sun sets) */}
      {(currentAct === 'act1' || currentAct === 'act2') && timeOfDay > 0.35 && (
        <mesh position={moonPos}>
          <sphereGeometry args={[14, 16, 16]} />
          <meshBasicMaterial color="#fffbeb" />
        </mesh>
      )}

      {/* Act 5 Glitchy Sky Dome */}
      {isAct5 && (
        <mesh scale={[-1, 1, 1]}>
          <sphereGeometry args={[400, 16, 16]} />
          <meshBasicMaterial
            color={`rgb(${Math.round(currentFogColor.r * 180)}, ${Math.round(currentFogColor.g * 180)}, ${Math.round(
              currentFogColor.b * 180
            )})`}
            side={THREE.BackSide}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}

      {/* Sky Cracks (Holographic Grid Collapse) */}
      {(currentAct === 'act4' || currentAct === 'act5') && (
        <mesh ref={cracksRef}>
          <sphereGeometry args={[300, 24, 24]} />
          <meshBasicMaterial
            color={currentAct === 'act5' ? '#ff2a7f' : '#00f3ff'}
            wireframe
            transparent
            opacity={crackOpacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </>
  )
}
