import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import gsap from 'gsap'
import { useCutsceneStore, CUTSCENE_DEFS } from '../../systems/CutsceneSystem'

export default function CutsceneCamera() {
  const camera = useThree((s) => s.camera)
  const activeCutscene = useCutsceneStore((s) => s.activeCutscene)
  const endCutscene = useCutsceneStore((s) => s.endCutscene)
  
  const currentTimeline = useRef<gsap.core.Timeline | null>(null)
  
  // Custom look-at target vector that GSAP can animate.
  // In the useFrame loop, we will call camera.lookAt(lookTarget.current)
  const lookTarget = useRef(new Vector3(0, 0, 0))

  useEffect(() => {
    if (!activeCutscene) {
      if (currentTimeline.current) {
        currentTimeline.current.kill()
        currentTimeline.current = null
      }
      return
    }

    const def = CUTSCENE_DEFS[activeCutscene]
    if (!def) return

    // Clean up any existing animations
    if (currentTimeline.current) {
      currentTimeline.current.kill()
    }

    const tl = gsap.timeline({
      onComplete: () => {
        endCutscene()
      }
    })
    currentTimeline.current = tl

    // Define camera paths based on cutscene ID
    switch (activeCutscene) {
      case 'world_normal': {
        // Cutscene 1 — Game Opening: Wide sunset aerial pan descending to player
        lookTarget.current.set(0, 10, 0)
        camera.position.set(-110, 55, 110)
        
        tl.to(camera.position, {
          x: 0,
          y: 6,
          z: 29,
          duration: def.duration,
          ease: 'power2.inOut',
          onUpdate: () => {
            const progress = tl.progress()
            lookTarget.current.set(0, 10 - progress * 8.8, 24 - progress * 4)
          }
        })
        break
      }
      case 'first_glitch': {
        // Cutscene 2 — First Glitch Discovery: Focus close up on terminal
        lookTarget.current.set(0, 1.2, 24)
        camera.position.set(0, 3, 29)
        
        tl.to(camera.position, {
          x: -1.2,
          y: 1.5,
          z: 26.2,
          duration: def.duration,
          ease: 'sine.inOut',
          onUpdate: () => {
            // Slight noise vibration on camera position
            const progress = tl.progress()
            if (progress > 0.3 && progress < 0.6) {
              camera.position.x += (Math.random() - 0.5) * 0.08
              camera.position.y += (Math.random() - 0.5) * 0.08
            }
            lookTarget.current.set(0, 1.2, 24)
          }
        })
        break
      }
      case 'architect_notices': {
        // Cutscene 3 — The Architect Notices You: Quick snapping sweeps
        lookTarget.current.set(0, 2, 24)
        camera.position.set(2, 4, 30)
        
        tl.to(camera.position, {
          x: 0,
          y: 8,
          z: 16,
          duration: def.duration,
          ease: 'power1.inOut',
          onUpdate: () => {
            const progress = tl.progress()
            // Snap lookAt target toward different neon horizons
            if (progress < 0.3) {
              lookTarget.current.set(-15, 15, -10)
            } else if (progress < 0.6) {
              lookTarget.current.set(15, 18, 0)
            } else {
              lookTarget.current.set(0, 2, 24)
            }
          }
        })
        break
      }
      case 'city_distortion': {
        // Cutscene 4 — City Distortion Event: Dolly back showing stretching buildings
        lookTarget.current.set(0, 12, 0)
        camera.position.set(0, 8, 30)
        
        tl.to(camera.position, {
          x: -30,
          y: 25,
          z: 60,
          duration: def.duration,
          ease: 'power2.inOut',
          onUpdate: () => {
            lookTarget.current.set(0, 12 + tl.progress() * 8, 0)
          }
        })
        break
      }
      case 'hidden_layer': {
        // Cutscene 5 — Discovery of the Hidden Layer: Descent through grid planes
        lookTarget.current.set(0, 5, 24)
        camera.position.set(0, 48, 10)
        
        tl.to(camera.position, {
          x: 0,
          y: 5,
          z: 28,
          duration: def.duration,
          ease: 'power3.inOut',
          onUpdate: () => {
            lookTarget.current.set(0, 5 - tl.progress() * 3.8, 24)
          }
        })
        break
      }
      case 'the_rebels': {
        // Cutscene 6 — The Rebels: Observation sweep from tower dock
        lookTarget.current.set(80, 14, -40)
        camera.position.set(100, 12, -60)
        
        tl.to(camera.position, {
          x: 70,
          y: 19,
          z: -42,
          duration: def.duration,
          ease: 'sine.inOut',
          onUpdate: () => {
            lookTarget.current.set(80, 14, -40)
          }
        })
        break
      }
      case 'architect_warning': {
        // Cutscene 7 — The Architect’s Warning: Orbit around player capsule
        lookTarget.current.set(0, 1.2, 24)
        camera.position.set(4, 2, 28)
        
        const orbit = { angle: 0 }
        tl.to(orbit, {
          angle: Math.PI * 1.6,
          duration: def.duration,
          ease: 'power1.inOut',
          onUpdate: () => {
            const r = 5
            camera.position.x = Math.sin(orbit.angle) * r
            camera.position.z = 24 + Math.cos(orbit.angle) * r
            camera.position.y = 2 + (orbit.angle / Math.PI) * 0.8
            lookTarget.current.set(0, 1.2, 24)
          }
        })
        break
      }
      case 'worldwide_glitch': {
        // Cutscene 8 — Worldwide Glitch Cascade: Wide panorama of lakes and mountains
        lookTarget.current.set(170, 10, -170) // lake center
        camera.position.set(-80, 60, 200)
        
        tl.to(camera.position, {
          x: 120,
          y: 75,
          z: -180,
          duration: def.duration,
          ease: 'none',
          onUpdate: () => {
            const progress = tl.progress()
            // Pan from the digital lake across to the distant mountain borders
            lookTarget.current.set(170 - progress * 320, 10 + progress * 20, -170 - progress * 80)
          }
        })
        break
      }
      case 'memory_vault': {
        // Cutscene 9 — The Memory Vault: Vertical ascent inside memory stack
        lookTarget.current.set(0, 8, 50)
        camera.position.set(0, 2, 58)
        
        tl.to(camera.position, {
          y: 28,
          z: 46,
          duration: def.duration,
          ease: 'power1.inOut',
          onUpdate: () => {
            lookTarget.current.set(0, 8 + tl.progress() * 12, 50)
          }
        })
        break
      }
      case 'last_defense': {
        // Cutscene 10 — The Last Defense: Fast zoom out facing digital storm
        lookTarget.current.set(0, 15, 40)
        camera.position.set(0, 10, 48)
        
        tl.to(camera.position, {
          x: 75,
          y: 80,
          z: 150,
          duration: def.duration,
          ease: 'power2.in',
          onUpdate: () => {
            lookTarget.current.set(0, 15 + tl.progress() * 15, 40)
          }
        })
        break
      }
      case 'approach_core': {
        // Cutscene 11 — Approach to the Core: Slow walking track behind player
        lookTarget.current.set(0, 1.2, 5)
        camera.position.set(0, 2, 10)
        
        tl.to(camera.position, {
          x: 0,
          y: 1.5,
          z: 3.5,
          duration: def.duration,
          ease: 'none',
          onUpdate: () => {
            lookTarget.current.set(0, 1.2, 0)
          }
        })
        break
      }
      case 'confrontation': {
        // Cutscene 12 — The Architect: Circling final boss core structure
        lookTarget.current.set(0, 0, 0)
        camera.position.set(0, 3, 7)
        
        const orbit = { val: 0 }
        tl.to(orbit, {
          val: Math.PI * 2,
          duration: def.duration,
          ease: 'power1.inOut',
          onUpdate: () => {
            camera.position.x = Math.sin(orbit.val) * 6
            camera.position.z = Math.cos(orbit.val) * 6
            camera.position.y = 3 - (orbit.val / (Math.PI * 2)) * 1.8
            lookTarget.current.set(0, 0, 0)
          }
        })
        break
      }
      case 'ending_reboot': {
        // Ending A — Reboot Ending: fly upward and look straight down
        lookTarget.current.set(0, 0, 0)
        camera.position.set(0, 1, 4)
        
        tl.to(camera.position, {
          x: 0,
          y: 45,
          z: 0.1,
          duration: def.duration,
          ease: 'power3.in',
          onUpdate: () => {
            lookTarget.current.set(0, 0, 0)
          }
        })
        break
      }
      case 'ending_freedom': {
        // Ending B — Freedom Ending: backward camera zoom out into light
        lookTarget.current.set(0, 0, 0)
        camera.position.set(0, 0.5, 3)
        
        tl.to(camera.position, {
          z: 45,
          duration: def.duration,
          ease: 'power4.inOut',
          onUpdate: () => {
            lookTarget.current.set(0, 0, 0)
          }
        })
        break
      }
      case 'ending_collapse': {
        // Ending C — Collapse Ending: slide sideways and crash down
        lookTarget.current.set(0, 0, 0)
        camera.position.set(0, 1, 4)
        
        tl.to(camera.position, {
          x: 5,
          y: -4,
          z: 2,
          duration: def.duration,
          ease: 'bounce.out',
          onUpdate: () => {
            lookTarget.current.set(0, 0, 0)
          }
        })
        break
      }
    }

    return () => {
      tl.kill()
    }
  }, [activeCutscene, endCutscene, camera])

  // Align camera look-at direction on each render frame when a cutscene is active
  useFrame(() => {
    if (activeCutscene) {
      camera.lookAt(lookTarget.current)
    }
  })

  return null
}
