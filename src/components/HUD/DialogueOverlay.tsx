import { useEffect, useState, useRef } from 'react'
import { useGameStore } from '../../systems/StabilitySystem'
import { playKeySound, playSynthBeep } from '../../utils/sound'
import { useCutsceneStore } from '../../systems/CutsceneSystem'

export default function DialogueOverlay() {
  const currentDialogue = useGameStore((state) => state.currentDialogue)
  const dialogueIndex = useGameStore((state) => state.dialogueIndex)
  const advanceDialogue = useGameStore((state) => state.advanceDialogue)
  const activeCutscene = useCutsceneStore((state) => state.activeCutscene)

  const [displayText, setDisplayText] = useState('')
  const [isDone, setIsDone] = useState(false)
  const typewriterTimer = useRef<any>(null)

  const rawLine = currentDialogue ? currentDialogue[dialogueIndex] : ''

  // Run typewriter effect
  useEffect(() => {
    if (!rawLine) {
      setDisplayText('')
      setIsDone(false)
      return
    }

    // Reset typewriter state
    setDisplayText('')
    setIsDone(false)

    if (typewriterTimer.current) clearInterval(typewriterTimer.current)

    let charIdx = 0
    // Play a start alert sound for Architect vs System
    const isArchitect = rawLine.includes('[ARCHITECT]')
    playSynthBeep(isArchitect ? 400 : 700, 0.08, isArchitect ? 'sine' : 'triangle')

    typewriterTimer.current = setInterval(() => {
      charIdx++
      setDisplayText(rawLine.substring(0, charIdx))
      
      // Play a short click for every character typed
      if (charIdx % 2 === 0) {
        playKeySound()
      }

      if (charIdx >= rawLine.length) {
        clearInterval(typewriterTimer.current)
        setIsDone(true)
      }
    }, 25)

    return () => {
      if (typewriterTimer.current) clearInterval(typewriterTimer.current)
    }
  }, [rawLine])

  // Keypress listener to autocomplete or advance
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentDialogue) return

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!isDone) {
          // Force complete the line
          if (typewriterTimer.current) clearInterval(typewriterTimer.current)
          setDisplayText(rawLine)
          setIsDone(true)
        } else {
          // Advance to next line
          advanceDialogue()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentDialogue, isDone, rawLine, advanceDialogue])

  // Auto-advance subtitles during active cutscenes
  useEffect(() => {
    if (!currentDialogue || !activeCutscene) return

    // Auto advance 1.8 seconds after a line completes typing
    if (isDone) {
      const timer = setTimeout(() => {
        advanceDialogue()
      }, 1800)
      return () => clearTimeout(timer)
    }
  }, [currentDialogue, activeCutscene, isDone, advanceDialogue])

  if (!currentDialogue) return null

  // Format line styling based on who is talking
  const isArchitect = rawLine.includes('[ARCHITECT]')
  const dialogLabel = isArchitect ? 'THE ARCHITECT' : 'DIRECTIVE OVERRIDE'
  const textContent = displayText
    .replace(/^\[ARCHITECT\]:\s*/, '')
    .replace(/^\[SYSTEM\]:\s*/, '')

  return (
    <div className="fixed inset-0 z-45 pointer-events-none flex flex-col justify-between font-mono">
      {/* Top Widescreen Letterbox Bar */}
      <div className="w-full h-[12vh] bg-black border-b border-zinc-900 pointer-events-auto flex items-center px-12 justify-between">
        <div className="text-[10px] text-zinc-700 tracking-widest uppercase">
          SECURE CONNECTION // CHANNEL_LOG_88
        </div>
        <div className="text-[10px] text-zinc-700 tracking-widest">
          STATUS: INTRUSION DETECTED
        </div>
      </div>

      {/* Center Reticle Warning overlay when Architect is speaking */}
      {isArchitect && (
        <div className="absolute top-[15vh] left-12 p-3 bg-red-950/20 border border-red-900/40 text-red-500/80 text-[10px] tracking-wider uppercase animate-pulse">
          WARNING: SYSTEM LOG CORRUPTION ACTIVE
        </div>
      )}

      {/* Bottom Letterbox Bar + Subtitle text */}
      <div className="w-full min-h-[18vh] bg-black border-t border-zinc-900 pointer-events-auto p-8 px-12 relative flex flex-col justify-center">
        {/* Speaker Label */}
        <div
          className={`text-xs font-bold tracking-widest mb-2 ${
            isArchitect ? 'text-cyan-400' : 'text-emerald-500'
          }`}
        >
          {dialogLabel}
        </div>

        {/* Subtitle Dialogue Content */}
        <div className="text-zinc-100 text-base max-w-4xl leading-relaxed font-medium min-h-[3rem]">
          {textContent}
        </div>

        {/* Proceed Keystroke Label */}
        {isDone && (
          <div className="absolute bottom-4 right-12 text-[10px] text-zinc-500 tracking-widest animate-pulse flex items-center gap-1">
            PRESS <span className="bg-zinc-900 border border-zinc-700 px-1 py-0.5 rounded text-white text-[9px]">SPACE</span> TO CONTINUE
          </div>
        )}
      </div>
    </div>
  )
}
