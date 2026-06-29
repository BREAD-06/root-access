import { useEffect, useState } from 'react'
import { useGameStore } from '../../systems/StabilitySystem'
import { useCutsceneStore } from '../../systems/CutsceneSystem'
import StabilityMeter from './StabilityMeter'
import DialogueOverlay from './DialogueOverlay'
import StabilityStatusPanel from './StabilityStatusPanel'
import PlayerUI from './PlayerUI'
import MissionUI from './MissionUI'
import Minimap from './Minimap'
import Compass from './Compass'
import WorldMap from './WorldMap'
import CutsceneOverlay from './CutsceneOverlay'

export default function HUD() {
  const currentAct = useGameStore((state) => state.currentAct)
  const stabilityPercent = useGameStore((state) => state.stabilityPercent)
  const activeTarget = useGameStore((state) => state.activeTarget)
  const unlockedCommands = useGameStore((state) => state.unlockedCommands)

  const [isMapOpen, setIsMapOpen] = useState(false)
  const activeCutscene = useCutsceneStore((state) => state.activeCutscene)

  // Don't render general HUD in prologue, core, or active cutscenes
  const isMinimalHUD = currentAct === 'prologue' || currentAct === 'core' || activeCutscene !== null

  // Map acts to human readable names
  const actNames = {
    prologue: 'SYSTEM BOOT',
    act1: 'SECTOR A: INTEGRITY_NORMAL',
    act2: 'SECTOR A: INTEGRITY_FLICKER',
    act3: 'SECTOR A: INTEGRITY_DECAY',
    act4: 'SECTOR A: COLLAPSE_WARNING',
    act5: 'SECTOR A: FAILING_GRID',
    core: 'SYSTEM CORE CONFRONTATION',
  }

  // Toggle map on 'M' keypress (only when terminal console is closed)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isMinimalHUD) return
      if (e.key.toLowerCase() === 'm' && !useGameStore.getState().isConsoleOpen) {
        e.preventDefault()
        setIsMapOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMinimalHUD])

  // Style colors matching act progression
  const accentBorder = currentAct === 'act5' ? 'border-purple-950/80 bg-black/85 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'border-emerald-950 bg-black/75'
  const textAccent = currentAct === 'act5' ? 'text-purple-400' : 'text-emerald-500'
  const textTitle = currentAct === 'act5' ? 'text-purple-600 border-purple-950' : 'text-emerald-700 border-emerald-950'

  return (
    <>
      {/* 1. High-priority dialogue screens */}
      <DialogueOverlay />
      <CutsceneOverlay />

      {/* 2. Toggleable Full Screen World Map Overlay */}
      {isMapOpen ? (
        <WorldMap onClose={() => setIsMapOpen(false)} />
      ) : (
        <>
          {/* 3. Core stability meters (Hidden during cutscenes) */}
          {!activeCutscene && (
            <>
              <StabilityStatusPanel />
              <StabilityMeter />
            </>
          )}

          {/* 4. General Gameplay HUD (Not visible in prologue/core) */}
          {!isMinimalHUD && (
            <div className={`fixed inset-0 pointer-events-none z-30 font-mono text-xs ${currentAct === 'act5' ? 'text-purple-400' : 'text-emerald-500'}`}>
              
              {/* Top Compass banner */}
              <Compass />

              {/* Bottom-left rotating Minimap */}
              <Minimap />

              {/* Bottom-left health status */}
              <PlayerUI />

              {/* Top-right objective directives */}
              <MissionUI />

              {/* Top-Left Debugger Panel */}
              <div className={`absolute top-6 left-6 p-4 border rounded w-80 backdrop-blur-sm pointer-events-auto transition-all duration-300 ${accentBorder}`}>
                <div className={`flex justify-between items-center text-[10px] border-b pb-1 mb-2 font-bold tracking-widest uppercase ${textTitle}`}>
                  <span>DEBUGGER ONLINE</span>
                  <span className={`w-2 h-2 rounded-full animate-ping ${currentAct === 'act5' ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                </div>
                <div className="space-y-1 text-white">
                  <div>ACT: <span>{actNames[currentAct]}</span></div>
                  <div>MAIN CORE: <span>GENESIS_GRID_LINK</span></div>
                  <div>STABILITY: <span className={stabilityPercent < 25 ? 'text-red-500 font-bold animate-pulse' : ''}>{stabilityPercent}%</span></div>
                </div>
              </div>

              {/* Bottom-Left Command Database Panel (Stacked cleanly above the Minimap & Health Bar) */}
              <div className={`absolute bottom-[162px] left-6 p-4 border rounded w-72 backdrop-blur-sm pointer-events-auto transition-all duration-300 ${accentBorder}`}>
                <div className={`text-[10px] border-b pb-1 mb-2 font-bold tracking-widest uppercase ${textTitle}`}>
                  DECOMPILER_DATABASE
                </div>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-white">delete(target)</span>
                    <span className={`${textAccent} font-bold`}>[ACTIVE]</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white">clone(target)</span>
                    <span className={unlockedCommands.includes('clone') ? 'text-cyan-400 font-bold' : 'text-gray-600'}>
                      {unlockedCommands.includes('clone') ? '[UNLOCKED]' : '[LOCKED: ACT 2]'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white">freeze(target)</span>
                    <span className={unlockedCommands.includes('freeze') ? 'text-cyan-400 font-bold' : 'text-gray-600'}>
                      {unlockedCommands.includes('freeze') ? '[UNLOCKED]' : '[LOCKED: ACT 3]'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white">gravity(target)</span>
                    <span className={unlockedCommands.includes('gravity') ? 'text-cyan-400 font-bold' : 'text-gray-600'}>
                      {unlockedCommands.includes('gravity') ? '[UNLOCKED]' : '[LOCKED: ACT 4]'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Center Targeting HUD reticle details */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <div className={`w-1.5 h-1.5 rounded-full ${currentAct === 'act5' ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                  <div className={`absolute inset-0 border border-dashed rounded-full animate-[spin_20s_linear_infinite] ${
                    activeTarget 
                      ? (currentAct === 'act5' ? 'border-purple-400 scale-125' : 'border-cyan-400 scale-125') 
                      : (currentAct === 'act5' ? 'border-purple-800' : 'border-emerald-800')
                  }`} />
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </>
  )
}
