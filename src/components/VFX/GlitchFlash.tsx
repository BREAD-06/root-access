import { useEffect, useState, useRef } from 'react'
import { useGameStore } from '../../systems/StabilitySystem'
import { playGlitchSound } from '../../utils/sound'

/**
 * GlitchFlash triggers a quick fullscreen flash on command invocation.
 * Intensity scales up as stability decreases, reflecting the trauma to the grid.
 */
export default function GlitchFlash() {
  const commandsUsed = useGameStore((state) => state.commandsUsed)
  const stabilityPercent = useGameStore((state) => state.stabilityPercent)
  const [active, setActive] = useState(false)
  const prevCommands = useRef(commandsUsed)

  useEffect(() => {
    if (commandsUsed > prevCommands.current) {
      setActive(true)
      playGlitchSound()
      // Flash lasts for 150ms
      const t = setTimeout(() => setActive(false), 150)
      prevCommands.current = commandsUsed
      return () => clearTimeout(t)
    }
    prevCommands.current = commandsUsed
  }, [commandsUsed])

  if (!active) return null

  // Calculate flash opacity based on instability
  const baseOpacity = 0.2 + (100 - stabilityPercent) * 0.006 // ranges from 0.2 to 0.8
  const finalOpacity = Math.min(0.85, baseOpacity)

  return (
    <div
      className="fixed inset-0 pointer-events-none z-40 bg-cyan-100 transition-opacity duration-100 ease-out"
      style={{ opacity: finalOpacity }}
    />
  )
}
