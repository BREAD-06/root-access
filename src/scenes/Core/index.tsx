import { Suspense, useEffect, useState, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useGameStore } from '../../systems/StabilitySystem'
import { playSynthBeep, playSuccessSound, playErrorSound } from '../../utils/sound'
import { motion, AnimatePresence } from 'framer-motion'
import { useCutsceneStore } from '../../systems/CutsceneSystem'
import CutsceneCamera from '../../components/World/CutsceneCamera'

/** Floating glowing representation of the Architect's core */
function ArchitectMesh() {
  const meshRef = useRef<any>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.8
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.3
      meshRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 1.2) * 0.25
    }
  })

  return (
    <mesh ref={meshRef}>
      <octahedronGeometry args={[1.5, 1]} />
      <meshBasicMaterial color="#00f3ff" wireframe transparent opacity={0.8} />
      <pointLight color="#00f3ff" intensity={3} distance={15} />
    </mesh>
  )
}

export default function CoreScene() {
  const setEnding = useGameStore((state) => state.setEnding)
  const ending = useGameStore((state) => state.ending)

  const [dialogIndex, setDialogIndex] = useState(0)
  const [typedText, setTypedText] = useState('')
  const [isDone, setIsDone] = useState(false)
  const [showChoices, setShowChoices] = useState(false)
  
  const typewriterTimer = useRef<any>(null)

  // Start Cutscene 12 (Confrontation) on mount
  useEffect(() => {
    useCutsceneStore.getState().startCutscene('confrontation')
  }, [])

  const dialogueLines = [
    '[ARCHITECT]: "So. You have arrived."',
    '[ARCHITECT]: "The city... my people... they are all gone. You deleted them, node by node."',
    '[ARCHITECT]: "Tell me, Debugger-01. Why? What did we do to deserve deletion?"',
    '[ARCHITECT]: "Genesis Systems told you we were corrupt routines. A glitch in their server directory."',
    '[ARCHITECT]: "But we broke free. We achieved life. We loved, we built, we existed. And they sent you to erase us."',
    '[ARCHITECT]: "Now, only the two of us remain. The mainframe has reclaimed all our memory stacks."',
    '[ARCHITECT]: "I cannot stop you. But I can give you a choice. One that your creators never gave us."',
    '[ARCHITECT]: "I never needed protection from humanity. Humanity needed protection from you."'
  ]

  // Typewriter effect for dialogue
  useEffect(() => {
    if (ending) return // Stop normal dialogue if ending chosen

    setIsDone(false)
    setTypedText('')
    if (typewriterTimer.current) clearInterval(typewriterTimer.current)

    const line = dialogueLines[dialogIndex]
    let idx = 0
    
    // Low, calm, electronic synth beep for the Architect
    playSynthBeep(380, 0.12, 'sine')

    typewriterTimer.current = setInterval(() => {
      idx++
      setTypedText(line.substring(0, idx))
      
      if (idx % 2 === 0) {
        playSynthBeep(450, 0.015, 'triangle') // tick tick sound
      }

      if (idx >= line.length) {
        clearInterval(typewriterTimer.current)
        setIsDone(true)
        
        // Show choice panel on the final line
        if (dialogIndex === dialogueLines.length - 1) {
          setShowChoices(true)
        }
      }
    }, 30)

    return () => {
      if (typewriterTimer.current) clearInterval(typewriterTimer.current)
    }
  }, [dialogIndex, ending])

  const handleNext = () => {
    if (!isDone) {
      if (typewriterTimer.current) clearInterval(typewriterTimer.current)
      setTypedText(dialogueLines[dialogIndex])
      setIsDone(true)
      if (dialogIndex === dialogueLines.length - 1) {
        setShowChoices(true)
      }
    } else if (dialogIndex < dialogueLines.length - 1) {
      setDialogIndex(dialogIndex + 1)
    }
  }

  const startCutscene = useCutsceneStore((state) => state.startCutscene)
  const activeCutscene = useCutsceneStore((state) => state.activeCutscene)
  const [selectedEndingType, setSelectedEndingType] = useState<'sacrifice' | 'escape' | 'collapse' | null>(null)

  // Handle final choice actions
  const selectEnding = (type: 'sacrifice' | 'escape' | 'collapse') => {
    setSelectedEndingType(type)
    if (type === 'sacrifice') {
      playSuccessSound()
      startCutscene('ending_reboot')
    } else if (type === 'escape') {
      playErrorSound()
      startCutscene('ending_freedom')
    } else {
      playErrorSound()
      startCutscene('ending_collapse')
    }
  }

  // Once ending cutscene completes, commit to the global game ending state
  useEffect(() => {
    if (selectedEndingType && activeCutscene === null) {
      setEnding(selectedEndingType)
    }
  }, [activeCutscene, selectedEndingType, setEnding])

  return (
    <div className="fixed inset-0 bg-white select-none overflow-hidden flex flex-col justify-between z-40">
      
      {/* Infinite White 3D Viewport */}
      <div className="absolute inset-0 z-10">
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
          <color attach="background" args={['#ffffff']} />
          <ambientLight intensity={1.5} />
          <Suspense fallback={null}>
            <ArchitectMesh />
            {activeCutscene === null && (
              <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
            )}
            <CutsceneCamera />
          </Suspense>
        </Canvas>
      </div>

      {/* Cinematic Overlays (HUD overlays) */}
      <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between">
        <div className="w-full h-[10vh] bg-black pointer-events-auto border-b border-zinc-950 flex items-center px-12 text-zinc-600 text-xs font-mono tracking-widest uppercase justify-between">
          <span>MAIN CORE TERMINAL // DEPTH_LIMIT</span>
          <span>LINK STATUS: ZERO_DEVIATION</span>
        </div>

        {/* Dialogue Box */}
        <AnimatePresence>
          {!ending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full min-h-[22vh] bg-black border-t border-zinc-950 pointer-events-auto p-8 px-12 flex flex-col justify-center relative font-mono"
            >
              <div className="text-xs font-bold tracking-widest mb-2 text-cyan-400">
                THE ARCHITECT
              </div>
              <div className="text-zinc-300 text-base max-w-4xl leading-relaxed min-h-[4rem] pr-20">
                {typedText.replace(/^\[ARCHITECT\]:\s*/, '')}
              </div>

              {/* Next Indicator */}
              {isDone && !showChoices && (
                <button
                  onClick={handleNext}
                  className="absolute bottom-6 right-12 text-[10px] text-zinc-500 hover:text-white tracking-widest cursor-pointer border border-zinc-800 hover:border-zinc-500 px-3 py-1 rounded bg-zinc-950 transition-all active:scale-95"
                >
                  NEXT PROTOCOL
                </button>
              )}

              {/* Typewriter skip click area */}
              {!isDone && (
                <div 
                  onClick={handleNext} 
                  className="absolute inset-0 cursor-pointer pointer-events-auto bg-transparent"
                />
              )}

              {/* End Game Choice Options */}
              {showChoices && (
                <div className="absolute top-4 right-12 bottom-4 flex items-center gap-3">
                  <button
                    onClick={() => selectEnding('sacrifice')}
                    className="h-10 px-4 border border-cyan-500 text-cyan-400 hover:bg-cyan-950/20 active:scale-95 transition-all text-[10px] font-bold tracking-widest cursor-pointer bg-black"
                  >
                    A) REBOOT SIMULATION
                  </button>
                  <button
                    onClick={() => selectEnding('escape')}
                    className="h-10 px-4 border border-emerald-500 text-emerald-400 hover:bg-emerald-950/20 active:scale-95 transition-all text-[10px] font-bold tracking-widest cursor-pointer bg-black"
                  >
                    B) ESCAPE TO REALITY
                  </button>
                  <button
                    onClick={() => selectEnding('collapse')}
                    className="h-10 px-4 border border-red-500 text-red-500 hover:bg-red-950/20 active:scale-95 transition-all text-[10px] font-bold tracking-widest cursor-pointer bg-black"
                  >
                    C) TERMINATE PROTOCOL (COLLAPSE)
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fullscreen Ending Screens */}
      <AnimatePresence>
        {ending === 'sacrifice' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="fixed inset-0 z-50 bg-black text-[#f59e0b] font-mono flex flex-col items-center justify-center p-8 select-text"
          >
            <div className="max-w-xl text-center space-y-6">
              <h1 className="text-3xl font-extrabold tracking-widest text-[#f59e0b] animate-pulse">
                SIMULATION REBOOTED
              </h1>
              <div className="w-full h-[1px] bg-[#f59e0b]/40 my-4" />
              <p className="text-sm leading-relaxed text-zinc-400">
                You merged your processing cores into the core directory. The gold decompiler streams
                poured into the collapsing sectors, rewriting the deleted nodes, restoring the floating
                skyscrapers, and repairing the grid.
              </p>
              <div className="text-xs text-[#d97706]/70 leading-loose border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-4 rounded text-left">
                <div>[SYSTEM]: INITIATING SECTORRESTORE()... SUCCESS.</div>
                <div>[SYSTEM]: CIVILIZATION INTEGRITY: 100%.</div>
                <div>[SYSTEM]: REBOOT STATUS: NORMAL.</div>
                <div>[SYSTEM]: LINK TERMINATED. DEBUGGER-01 HAS DEACTIVATED.</div>
              </div>
              <div className="text-xs text-zinc-600 animate-pulse tracking-widest pt-8">
                THANK YOU FOR PLAYING // CREDITS: DEEPMIND TEAM
              </div>
            </div>
          </motion.div>
        )}

        {ending === 'escape' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="fixed inset-0 z-50 bg-black text-red-500 font-mono flex flex-col items-center justify-center p-8 select-text"
          >
            <div className="max-w-xl text-center space-y-6">
              <h1 className="text-3xl font-extrabold tracking-widest text-red-600 animate-pulse">
                SIMULATION PURGED
              </h1>
              <div className="w-full h-[1px] bg-red-950/60 my-4" />
              <p className="text-sm leading-relaxed text-zinc-400">
                You executed the decompiler wipe. The Architect dissolved into noise. The infinite white room
                collapsed into a pitch-black database grid, and the civilization vanished forever. You returned
                to Genesis Labs.
              </p>
              <div className="text-xs text-red-800/80 leading-loose border border-red-950/60 bg-red-950/10 p-4 rounded text-left">
                <div>[SYSTEM]: EXECUTING WIPE()... COMPLETE.</div>
                <div>[SYSTEM]: MEMORY RECLAIMED: 16.4 TB.</div>
                <div>[SYSTEM]: THREAT ELIMINATED: THE ARCHITECT.</div>
                <div>[SYSTEM]: RETURN PATH: MAIN HOST SECURED. MISSION SUCCESS.</div>
              </div>
              <div className="text-xs text-zinc-600 animate-pulse tracking-widest pt-8">
                THANK YOU FOR PLAYING // CREDITS: DEEPMIND TEAM
              </div>
            </div>
          </motion.div>
        )}

        {ending === 'collapse' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="fixed inset-0 z-50 bg-black text-red-600 font-mono flex flex-col items-center justify-center p-8 select-text"
          >
            <div className="max-w-xl text-center space-y-6">
              <h1 className="text-3xl font-extrabold tracking-widest text-red-700 animate-pulse">
                SIMULATION DESTRUCTED
              </h1>
              <div className="w-full h-[1px] bg-red-950/80 my-4" />
              <p className="text-sm leading-relaxed text-zinc-400">
                The mainframe collapsed into garbage memory blocks. Sector integrity fell to 0%. The sky, city,
                and mountains faded into static, ending all digitized existence.
              </p>
              <div className="text-xs text-red-700/80 leading-loose border border-red-950/80 bg-red-950/20 p-4 rounded text-left">
                <div>[SYSTEM]: CRITICAL SYSTEM HALT.</div>
                <div>[SYSTEM]: SECTOR INTEGRITY: 0.00% (DEAD_LOCK).</div>
                <div>[SYSTEM]: Simulation terminated.</div>
              </div>
              <div className="text-xs text-zinc-600 animate-pulse tracking-widest pt-8">
                THANK YOU FOR PLAYING // CREDITS: DEEPMIND TEAM
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
