import React, { useEffect, useState } from 'react'
import { useGameStore } from '../../systems/StabilitySystem'

export default function PlayerUI() {
  const playerHealth = useGameStore((s) => s.playerHealth)
  const currentAct = useGameStore((s) => s.currentAct)
  const [showDamageFlash, setShowDamageFlash] = useState(false)
  const [prevHealth, setPrevHealth] = useState(playerHealth)

  useEffect(() => {
    if (playerHealth < prevHealth) {
      setShowDamageFlash(true)
      const t = setTimeout(() => setShowDamageFlash(false), 250)
      setPrevHealth(playerHealth)
      return () => clearTimeout(t)
    } else if (playerHealth > prevHealth) {
      setPrevHealth(playerHealth)
    }
  }, [playerHealth, prevHealth])

  const isLowHealth = playerHealth <= 25

  // Theme color based on currentAct / stability
  const accentColor = currentAct === 'act5' ? 'text-purple-400 border-purple-500/50 shadow-[0_0_25px_rgba(168,85,247,0.15)]' : 'text-cyan-400 border-cyan-500/50 shadow-[0_0_25px_rgba(0,243,255,0.15)]'
  const barBg = currentAct === 'act5' ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]'

  return (
    <>
      {/* 1. Low health full screen red pulse vignette overlay */}
      {isLowHealth && playerHealth > 0 && (
        <div className="fixed inset-0 pointer-events-none z-30 animate-pulse border-[6px] border-red-600/40 shadow-[inset_0_0_80px_rgba(239,68,68,0.5)]" />
      )}

      {/* 2. Brief full-screen flash on taking damage */}
      {showDamageFlash && (
        <div className="fixed inset-0 bg-red-900/25 pointer-events-none z-50 transition-opacity duration-150" />
      )}

      {/* 3. Futuristic Health Bar Panel */}
      <div className={`fixed bottom-6 left-[166px] w-72 z-40 bg-black/85 border ${accentColor} p-4 font-mono backdrop-blur-sm transition-all duration-300`}>
        {/* Header bar */}
        <div className="flex justify-between items-center text-xs tracking-wider border-b border-white/10 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-500 animate-pulse" />
            <span className="uppercase text-white font-bold">SYSTEM INTEGRITY</span>
          </div>
          <span className={`font-semibold ${isLowHealth ? 'text-red-500 animate-pulse font-bold' : 'text-cyan-300'}`}>
            HP: {playerHealth} / 100
          </span>
        </div>

        {/* Double-bar visual overlay */}
        <div className="relative w-full h-4 bg-cyan-950/40 border border-white/15 overflow-hidden">
          {/* LAGGING RED GHOST BAR (Damage animation) */}
          <div 
            className="absolute top-0 left-0 h-full bg-red-600/80 transition-all duration-1000 delay-300"
            style={{ width: `${prevHealth}%` }}
          />

          {/* ACTIVE PRIMARY HEALTH BAR */}
          <div 
            className={`absolute top-0 left-0 h-full ${isLowHealth ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' : barBg} transition-all duration-150`}
            style={{ width: `${playerHealth}%` }}
          />
          
          {/* Subtle grid stripe pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_90%,rgba(0,0,0,0.4)_90%)] bg-[length:8px_100%] pointer-events-none" />
        </div>

        {/* Diagnostic alert message */}
        {isLowHealth ? (
          <div className="mt-2.5 text-[10px] text-red-500 animate-pulse uppercase tracking-widest flex items-center gap-1.5">
            <span>⚠</span>
            <span>CRITICAL: BUFFER INTEGRITY CRITICAL</span>
          </div>
        ) : (
          <div className="mt-2.5 text-[9px] text-white/40 uppercase tracking-wider flex justify-between">
            <span>KERNEL: DEB_01_SYS</span>
            <span>STATUS: NOMINAL</span>
          </div>
        )}
      </div>
    </>
  )
}
