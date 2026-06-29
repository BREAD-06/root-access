import { useEffect, useState } from 'react'
import { useGameStore } from '../../systems/StabilitySystem'
import { playGlitchSound } from '../../utils/sound'

export default function StabilityMeter() {
  const stabilityPercent = useGameStore((state) => state.stabilityPercent)
  const currentAct = useGameStore((state) => state.currentAct)

  const [pulse, setPulse] = useState(false)
  const [prevStability, setPrevStability] = useState(stabilityPercent)

  // Trigger pulse effect and sound on stability drop
  useEffect(() => {
    if (stabilityPercent < prevStability) {
      setPulse(true)
      playGlitchSound()
      const t = setTimeout(() => setPulse(false), 800)
      setPrevStability(stabilityPercent)
      return () => clearTimeout(t)
    }
    setPrevStability(stabilityPercent)
  }, [stabilityPercent, prevStability])

  // Stability meter only becomes visible below 60% stability (Act 3 onwards per CLAUDE.md)
  const isVisible = stabilityPercent <= 60 && currentAct !== 'prologue' && currentAct !== 'core'

  if (!isVisible) return null

  // Determine meter color based on thresholds
  let colorClass = 'bg-[#10b981] shadow-[0_0_10px_#10b981]' // Green
  let borderClass = 'border-[#10b981]'
  let textClass = 'text-[#10b981]'

  if (stabilityPercent <= 20) {
    colorClass = 'bg-[#ef4444] shadow-[0_0_12px_#ef4444] animate-pulse' // Red
    borderClass = 'border-[#ef4444]'
    textClass = 'text-[#ef4444] font-extrabold animate-pulse'
  } else if (stabilityPercent <= 40) {
    colorClass = 'bg-[#f59e0b] shadow-[0_0_10px_#f59e0b]' // Yellow / Orange
    borderClass = 'border-[#f59e0b]'
    textClass = 'text-[#f59e0b]'
  }

  return (
    <div
      className={`fixed top-[144px] right-6 z-40 p-4 border rounded bg-black/85 backdrop-blur-md transition-all duration-300 font-mono w-72 ${borderClass} ${
        pulse ? 'scale-105 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)]' : ''
      }`}
    >
      {/* Glitch lines design */}
      <div className="flex justify-between items-center mb-2 text-xs tracking-wider">
        <span className={textClass}>SIMULATION INTEGRITY</span>
        <span className={`text-sm font-bold ${textClass}`}>{stabilityPercent}%</span>
      </div>
      
      {/* Stability Bar Frame */}
      <div className={`w-full h-3 border p-[2px] ${borderClass}`}>
        <div
          className={`h-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${stabilityPercent}%` }}
        />
      </div>

      <div className="flex justify-between items-center mt-2 text-[9px] text-gray-500 tracking-tighter">
        <span>SECTOR: 0x7F // CORE_REF: ARC_902</span>
        <span>{stabilityPercent <= 20 ? 'CRITICAL FAILURE' : 'SYSTEM DECAY ACTIVE'}</span>
      </div>
    </div>
  )
}
