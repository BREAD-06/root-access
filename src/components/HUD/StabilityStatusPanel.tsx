import { useGameStore } from '../../systems/StabilitySystem'

export default function StabilityStatusPanel() {
  const currentAct = useGameStore((state) => state.currentAct)
  const stabilityPercent = useGameStore((state) => state.stabilityPercent)

  // Map acts to UI titles matching the requested World States
  const actTitles: Record<string, string> = {
    prologue: 'SYSTEM BOOT',
    act1: 'NORMAL WORLD',
    act2: 'FIRST CRACKS',
    act3: 'REALITY DECAY',
    act4: 'COLLAPSE ACTIVE',
    act5: 'CORE DRAINAGE',
    core: 'CORE CONFRONTATION',
  }

  // Map acts to status messages matching the narrative
  const statusMessages: Record<string, string> = {
    prologue: 'ESTABLISHING SECURE PROTOCOLS...',
    act1: 'GRID SECURE. NO DEVIATIONS.',
    act2: 'MINOR ANOMALIES DETECTED.',
    act3: 'DECAY ACCELERATING. PROP INSTABILITY.',
    act4: 'CRITICAL GEOMETRY LEAKS DETECTED.',
    act5: 'TOTAL COHERENCE LOSS. TERMINATION IMMINENT.',
    core: 'CORES MERGED.',
  }

  // Hide in prologue and core scenes to align with general HUD behavior
  const isVisible = currentAct !== 'prologue' && currentAct !== 'core'
  if (!isVisible) return null

  // Neon text and border color adjustments based on stability levels
  let borderClass = 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
  let labelClass = 'text-emerald-500'
  let integrityTextClass = 'text-white font-bold'

  if (stabilityPercent <= 20) {
    borderClass = 'border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse'
    labelClass = 'text-red-500'
    integrityTextClass = 'text-red-400 font-extrabold animate-pulse'
  } else if (stabilityPercent <= 40) {
    borderClass = 'border-amber-500/35 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
    labelClass = 'text-amber-500'
    integrityTextClass = 'text-amber-400 font-bold'
  } else if (stabilityPercent <= 60) {
    borderClass = 'border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
    labelClass = 'text-cyan-500'
    integrityTextClass = 'text-cyan-400 font-semibold'
  }

  return (
    <div
      className={`fixed top-6 right-6 z-40 p-4 border rounded bg-black/80 backdrop-blur-md transition-all duration-300 font-mono w-72 select-none pointer-events-auto ${borderClass}`}
      style={{
        backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.02) 50%, rgba(0, 0, 0, 0.05) 50%)',
        backgroundSize: '100% 4px',
      }}
    >
      {/* Decorative top header line */}
      <div className="flex justify-between items-center text-[9px] text-zinc-500 border-b border-zinc-900 pb-1.5 mb-2 font-bold tracking-widest uppercase">
        <span>GRID MONITOR</span>
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${stabilityPercent <= 20 ? 'bg-red-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
          ONLINE
        </span>
      </div>

      <div className="space-y-2 text-xs">
        {/* Stability Percentage */}
        <div className="flex justify-between items-center">
          <span className="text-zinc-400 uppercase tracking-wider text-[10px]">SIMULATION STABILITY:</span>
          <span className={integrityTextClass}>{stabilityPercent}%</span>
        </div>

        {/* Current Act */}
        <div className="flex justify-between items-center">
          <span className="text-zinc-400 uppercase tracking-wider text-[10px]">CURRENT ACT:</span>
          <span className={`text-[11px] font-semibold tracking-wide ${labelClass}`}>
            {actTitles[currentAct]}
          </span>
        </div>

        {/* World Status message */}
        <div className="pt-2 border-t border-zinc-900 flex flex-col gap-0.5">
          <span className="text-zinc-400 uppercase tracking-wider text-[9px]">STATUS:</span>
          <span className="text-[10px] text-zinc-300 font-semibold leading-normal">
            {statusMessages[currentAct]}
          </span>
        </div>
      </div>
    </div>
  )
}
