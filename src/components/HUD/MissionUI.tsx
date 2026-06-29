import React, { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../systems/StabilitySystem'
import * as THREE from 'three'

export default function MissionUI() {
  const currentObjective = useGameStore((s) => s.currentObjective)
  const currentTasks = useGameStore((s) => s.currentTasks)
  const objectivePosition = useGameStore((s) => s.objectivePosition)
  const currentAct = useGameStore((s) => s.currentAct)

  const [distanceText, setDistanceText] = useState<string>('')
  const lastUpdateRef = useRef(0)

  // Fast direct tick loop to update distance without triggering React state on every frame
  useEffect(() => {
    let active = true

    const updateDistance = () => {
      if (!active) return

      const now = performance.now()
      if (now - lastUpdateRef.current > 200) { // Update 5 times per second (lightweight, responsive)
        lastUpdateRef.current = now

        const playerPos = (window as any).__playerPosition as THREE.Vector3 | undefined
        if (playerPos && objectivePosition) {
          const dx = playerPos.x - objectivePosition[0]
          const dy = playerPos.y - objectivePosition[1]
          const dz = playerPos.z - objectivePosition[2]
          const dist = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz))
          setDistanceText(`${dist}m`)
        } else {
          setDistanceText('')
        }
      }

      requestAnimationFrame(updateDistance)
    }

    updateDistance()
    return () => {
      active = false
    }
  }, [objectivePosition])

  const accentColor = currentAct === 'act5' ? 'border-purple-500/50 text-purple-400' : 'border-cyan-500/50 text-cyan-400'
  const textHighlight = currentAct === 'act5' ? 'text-purple-300' : 'text-cyan-300'

  return (
    <div 
      className={`fixed top-[310px] right-6 w-80 bg-black/85 border ${accentColor} p-4 text-white font-mono flex flex-col gap-3 shadow-[0_0_20px_rgba(0,243,255,0.05)] z-40 backdrop-blur-sm transition-all duration-300`}
    >
      <div className="uppercase tracking-widest text-xs border-b border-white/10 pb-2 flex justify-between">
        <span>CURRENT DIRECTIVE</span>
        <span className={`${currentAct === 'act5' ? 'text-purple-500' : 'text-cyan-500'} animate-pulse font-bold`}>● ACTIVE</span>
      </div>
      
      <div className="flex flex-col gap-1">
        <div className={`font-bold text-base ${textHighlight}`}>
          {currentObjective}
        </div>
        {distanceText && (
          <div className="text-[10px] text-white/50 tracking-wider flex justify-between mt-1">
            <span>TARGET POSITION</span>
            <span className="font-bold text-white tracking-widest bg-white/5 px-1.5 rounded">{distanceText}</span>
          </div>
        )}
      </div>

      {currentTasks.length > 0 && (
        <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-white/5">
          {currentTasks.map((task) => (
            <div key={task.id} className={`flex items-start gap-3 text-xs ${task.completed ? 'opacity-40' : ''}`}>
              {/* Checkbox indicator */}
              <div 
                className={`mt-0.5 w-3.5 h-3.5 border flex items-center justify-center shrink-0 transition-colors duration-200 ${
                  task.completed 
                    ? 'border-emerald-600 bg-emerald-950/60 text-emerald-400' 
                    : 'border-white/30 bg-black/50'
                }`}
              >
                {task.completed && <span className="text-[10px] font-bold">✓</span>}
              </div>
              <span className={`leading-relaxed ${task.completed ? 'line-through text-white/40' : 'text-white/80'}`}>
                {task.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
