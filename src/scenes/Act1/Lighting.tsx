import { Suspense, useMemo, useRef } from 'react'
import { Environment } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { getLayout, linePos } from './cityConfig'
import { useGameStore } from '../../systems/StabilitySystem'
import * as THREE from 'three'

/**
 * Dynamic lighting that degrades and alters its mood based on simulation stability,
 * and handles the dynamic sunset-to-night light transitions.
 */
export default function Lighting() {
  const currentAct = useGameStore((state) => state.currentAct)
  const stabilityPercent = useGameStore((state) => state.stabilityPercent)
  const timeOfDay = useGameStore((state) => state.timeOfDay)

  const dirLightRef = useRef<THREE.DirectionalLight>(null)
  const ambLightRef = useRef<THREE.AmbientLight>(null)
  const streetLightsGroupRef = useRef<THREE.Group>(null)

  // Track elapsed time for color cycles and lightning strikes
  const timeRef = useRef(0)
  const lightningTimer = useRef(0)
  const nextLightningDelay = useRef(2 + Math.random() * 6)

  // 4 warm streetlight glows at key intersections.
  const streetLights = useMemo(() => {
    const pts: Array<[number, number, number]> = []
    for (const ix of [2, 6]) {
      for (const iz of [3, 5]) {
        pts.push([linePos(ix), 4, linePos(iz)])
      }
    }
    return pts
  }, [])

  // 2 beacons on the tallest skyscrapers.
  const beacons = useMemo(() => {
    return getLayout()
      .skyscrapers.slice(0, 2)
      .map((s): [number, number, number] => [
        s.position[0],
        s.scale * 3.2,
        s.position[2],
      ])
  }, [])

  useFrame((_, delta) => {
    timeRef.current += delta

    const dirLight = dirLightRef.current
    const ambLight = ambLightRef.current
    if (!dirLight || !ambLight) return

    // Base light levels by Act / Time of Day
    let baseDirIntensity = 2.5
    let baseDirColor = '#fff5e0'
    let baseAmbIntensity = 0.6
    let baseAmbColor = '#b0c8ff'

    // 1. Act 1 & 2 Sunset-to-Night Dynamic Light calculations
    if (currentAct === 'act1' || currentAct === 'act2') {
      const t = timeOfDay

      // Direct light transitions: Sun sets, then Moon rises
      if (t <= 0.5) {
        // Sun phase: descends and fades out
        const factor = t / 0.5
        dirLight.position.set(100, 15 - factor * 25, 50)
        baseDirIntensity = THREE.MathUtils.lerp(2.5, 0.0, factor)
        
        const sunStart = new THREE.Color('#fff5e0')
        const sunSunset = new THREE.Color('#fdba74')
        const c = new THREE.Color().copy(sunStart).lerp(sunSunset, factor)
        baseDirColor = `#${c.getHexString()}`
      } else {
        // Moon phase: rises from opposite side and fades in
        const factor = (t - 0.5) / 0.5
        dirLight.position.set(-100, -10 + factor * 60, -50)
        baseDirIntensity = THREE.MathUtils.lerp(0.0, 0.8, factor)
        baseDirColor = '#dbeafe' // cool blue moon light
      }

      // Ambient light transitions: warm peach -> cool deep night blue
      const sunsetAmb = new THREE.Color('#fdba74')
      const nightAmb = new THREE.Color('#0a1128')
      const ambC = new THREE.Color().copy(sunsetAmb).lerp(nightAmb, t)
      
      baseAmbIntensity = THREE.MathUtils.lerp(0.6, 0.15, t)
      baseAmbColor = `#${ambC.getHexString()}`

    } else if (currentAct === 'act3') {
      baseDirIntensity = 1.0
      baseDirColor = '#c084fc' // Purple sunset
      baseAmbIntensity = 0.3
      baseAmbColor = '#4a154b' // Dark purple
    } else if (currentAct === 'act4') {
      baseDirIntensity = 0.2 // Dark storm
      baseDirColor = '#2d3748'
      baseAmbIntensity = 0.12
      baseAmbColor = '#1a202c'
    } else if (currentAct === 'act5') {
      baseDirIntensity = 0.1
      baseAmbIntensity = 0.05
      
      const angle = timeRef.current * 0.8
      const r = Math.sin(angle) * 0.5 + 0.5
      const g = Math.sin(angle + Math.PI * 2 / 3) * 0.5 + 0.5
      const b = Math.sin(angle + Math.PI * 4 / 3) * 0.5 + 0.5
      
      dirLight.color.setRGB(r, g * 0.2, b)
      ambLight.color.setRGB(r * 0.2, g * 0.1, b * 0.3)
    }

    // Apply baseline settings (when not lightning flashing)
    if (currentAct !== 'act5') {
      dirLight.color.set(baseDirColor)
      ambLight.color.set(baseAmbColor)
    }

    dirLight.intensity = baseDirIntensity
    ambLight.intensity = baseAmbIntensity

    // 2. Act 4 Storm & Lightning
    if (currentAct === 'act4') {
      if (lightningTimer.current > 0) {
        lightningTimer.current -= delta
        dirLight.intensity = 8.5
        dirLight.color.set('#e2e8f0')
        ambLight.intensity = 1.8
        ambLight.color.set('#e2e8f0')
      } else {
        if (timeRef.current >= nextLightningDelay.current) {
          lightningTimer.current = 0.1 + Math.random() * 0.15
          timeRef.current = 0
          nextLightningDelay.current = 3 + Math.random() * 7
        }
      }
    }

    // 3. Street Light & Beacon intensity modulation
    if (streetLightsGroupRef.current) {
      streetLightsGroupRef.current.traverse((child) => {
        if (child instanceof THREE.PointLight) {
          if (currentAct === 'act5') {
            child.intensity = Math.random() < 0.15 ? 0.05 : 1.2 * (stabilityPercent / 20)
            child.color.set(Math.random() < 0.2 ? '#ff0055' : '#ff9944')
          } else if (currentAct === 'act4') {
            child.intensity = (0.7 + Math.random() * 0.3) * 1.5
          } else if (currentAct === 'act1' || currentAct === 'act2') {
            const multiplier = Math.max(0, Math.min(1.0, (timeOfDay - 0.35) / 0.35))
            const maxIntensity = child.name.startsWith('beacon') ? 2.0 : 1.5
            child.intensity = maxIntensity * multiplier
            child.color.set(child.name.startsWith('beacon') ? '#4488ff' : '#ff9944')
          } else {
            child.intensity = child.name.startsWith('beacon') ? 2.0 : 1.5
            child.color.set(child.name.startsWith('beacon') ? '#4488ff' : '#ff9944')
          }
        }
      })
    }
  })

  return (
    <>
      <directionalLight
        ref={dirLightRef}
        color="#fff5e0"
        intensity={2.5}
        position={[100, 80, 50]}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.6}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <ambientLight ref={ambLightRef} color="#b0c8ff" intensity={0.6} />

      <group ref={streetLightsGroupRef}>
        {streetLights.map((p, i) => (
          <pointLight
            key={`street-${i}`}
            name={`street-${i}`}
            position={p}
            color="#ff9944"
            intensity={1.5}
            distance={25}
            decay={2}
          />
        ))}

        {beacons.map((p, i) => (
          <pointLight
            key={`beacon-${i}`}
            name={`beacon-${i}`}
            position={p}
            color="#4488ff"
            intensity={2}
            distance={40}
            decay={2}
          />
        ))}
      </group>

      <Suspense fallback={null}>
        <Environment preset="night" environmentIntensity={0.2} />
      </Suspense>
    </>
  )
}
