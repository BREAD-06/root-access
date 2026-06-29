import { useEffect } from 'react'
import { useCutsceneStore, CUTSCENE_DEFS } from '../../systems/CutsceneSystem'
import { motion, AnimatePresence } from 'framer-motion'

export default function CutsceneOverlay() {
  const activeCutscene = useCutsceneStore((s) => s.activeCutscene)
  const isTransitionFading = useCutsceneStore((s) => s.isTransitionFading)
  const skipCutscene = useCutsceneStore((s) => s.skipCutscene)

  const def = activeCutscene ? CUTSCENE_DEFS[activeCutscene] : null

  // Escape key skip listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeCutscene && e.key === 'Escape') {
        e.preventDefault()
        skipCutscene()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeCutscene, skipCutscene])

  if (!activeCutscene && !isTransitionFading) return null

  return (
    <>
      {/* 1. Widescreen Letterbox Bars */}
      {activeCutscene && (
        <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between font-mono">
          {/* Top Letterbox Bar */}
          <div className="w-full h-[12vh] bg-black border-b border-zinc-900 pointer-events-auto flex items-center px-12 justify-between">
            <div className="text-[10px] text-zinc-500 tracking-widest uppercase">
              CINEMATIC FEED // FEED_ID_{def?.id.toUpperCase()}
            </div>
            <div className="text-[10px] text-zinc-500 tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
              RECORDING STATUS: ACTIVE
            </div>
          </div>

          {/* Bottom Letterbox Bar */}
          <div className="w-full h-[18vh] bg-black border-t border-zinc-900 pointer-events-auto relative">
            {/* Skip Prompt */}
            <div className="absolute bottom-4 right-12 text-[10px] text-zinc-500 tracking-widest flex items-center gap-1.5 select-none">
              PRESS <span className="bg-zinc-900 border border-zinc-700 px-1.5 py-0.5 rounded text-white text-[9px] font-bold">ESC</span> TO SKIP
            </div>
          </div>
        </div>
      )}

      {/* 2. Cinematic Title Card (Overlay) */}
      <AnimatePresence>
        {activeCutscene && def && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.5, duration: 1.0 }}
            className="fixed inset-0 pointer-events-none z-42 flex flex-col items-center justify-center font-mono select-none"
          >
            <div className="text-center p-8 bg-black/60 backdrop-blur-sm border border-zinc-800/40 rounded-lg max-w-xl">
              <h1 className="text-cyan-400 text-lg font-bold tracking-[0.25em] uppercase mb-2">
                {def.title}
              </h1>
              <p className="text-zinc-400 text-xs tracking-widest uppercase">
                {def.subtitle}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Fullscreen Transition Fade Blackout */}
      <AnimatePresence>
        {isTransitionFading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-black pointer-events-auto flex items-center justify-center font-mono text-zinc-500 text-xs tracking-widest"
          >
            DEFRAGMENTING REALITY...
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
