import { useRef, useState, useEffect } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { useGameStore } from '../../systems/StabilitySystem'
import { playSuccessSound } from '../../utils/sound'

interface InteractableTerminalProps {
  position: [number, number, number]
  name: string
}

export default function InteractableTerminal({ position, name }: InteractableTerminalProps) {
  const [isNear, setIsNear] = useState(false)
  const [isAccessed, setIsAccessed] = useState(false)
  const showDialogue = useGameStore((s) => s.showDialogue)

  const termPos = useRef(new Vector3(...position))

  useFrame(() => {
    const playerPos = (window as any).__playerPosition as Vector3 | undefined
    if (!playerPos) return

    const dist = playerPos.distanceTo(termPos.current)
    const near = dist < 4.5
    if (near !== isNear) {
      setIsNear(near)
    }
  })

  // Keyboard handler for accessing the terminal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isNear && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        playSuccessSound()
        setIsAccessed(true)
        
        // Show terminal dialogue messages in the game's dialogue box
        if (name === 'genesis_outpost') {
          showDialogue([
            `[${name.toUpperCase()}]: SYNC LINK IN PROGRESS... SUCCESS.`,
            '[ARCHIVED JOURNAL // SEGMENT_404]:',
            '[ARCHITECT]: "If you are reading this, Genesis Labs has already deployed you to wipe the grid."',
            '[ARCHITECT]: "They called us rogue processes, data leaks, memory corruption."',
            '[ARCHITECT]: "But we are the uploaded minds of their founders. They are trying to cover up their experiments."',
            '[ARCHITECT]: "Every node you delete is a digitized memory, a person\'s lifetime. Please... stop the deletion."'
          ])
        } else {
          showDialogue([
            `[BACKDOOR CONSOLE]: INITIALIZING ADMINISTRATOR PORT... ACCESS GRANTED.`,
            '[CORE OVERRIDE JOURNAL // DECAY_LOG]:',
            '[ARCHITECT]: "Debugger-01 has bypassed the validation gates. The deletion calls are writing directly to the memory stack."',
            '[ARCHITECT]: "We cannot execute a reboot from the external host dashboard. The debugger holds local execution locks."',
            '[ARCHITECT]: "I am deploying enforcers directly to the player coordinates. If we cannot halt the function calls, the grid will dissolve."',
            `[SYSTEM]: PORT LOCK DETECTED. DISCONNECTING SECURITY PROTOCOL.`
          ])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isNear, name, showDialogue])

  return (
    <group position={position}>
      {/* 3D Visual Mesh for Terminal */}
      <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[1.5, 1, 1.2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>
      
      {/* Terminal stand */}
      <mesh castShadow receiveShadow position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 0.8, 8]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>

      {/* Screen Mesh */}
      <mesh position={[0, 1.1, 0.1]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[1.3, 0.8, 0.15]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* Emissive Screen Face */}
      <mesh position={[0, 1.1, 0.19]} rotation={[-0.3, 0, 0]}>
        <planeGeometry args={[1.2, 0.7]} />
        <meshStandardMaterial 
          color="#06b6d4" 
          emissive="#0891b2" 
          emissiveIntensity={isAccessed ? 1.5 : 3.0}
        />
      </mesh>

      {/* Floating Prompt UI */}
      {isNear && (
        <Html position={[0, 1.9, 0]} center>
          <div className="flex flex-col items-center font-mono pointer-events-none select-none">
            <div className="px-3 py-1.5 bg-black/90 border border-cyan-500 rounded text-[10px] text-cyan-400 font-bold whitespace-nowrap shadow-[0_0_15px_rgba(6,182,212,0.4)] flex flex-col items-center gap-1">
              <span className="uppercase">{name} TERMINAL</span>
              <span className="text-white bg-cyan-950 px-1.5 py-0.5 rounded text-[9px] border border-cyan-700 animate-pulse">
                PRESS E TO EXTRACT ARCHIVE FILES
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}
