import React, { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../systems/StabilitySystem'
import * as THREE from 'three'

export default function Compass() {
  const objectivePosition = useGameStore((s) => s.objectivePosition)
  const customWaypoint = useGameStore((s) => s.customWaypoint)
  const currentAct = useGameStore((s) => s.currentAct)

  const containerRef = useRef<HTMLDivElement>(null)
  const compassTapeRef = useRef<HTMLDivElement>(null)
  const objectiveIndicatorRef = useRef<HTMLDivElement>(null)
  const waypointIndicatorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true

    // The scale of degrees to pixels: 2 pixels per degree (720px for a full 360 rotation)
    const degToPx = 2
    const centerOffset = 192 // 384px wide / 2 = 192px center point

    const update = () => {
      if (!active) return

      // Read real-time values from window
      const playerPos = (window as any).__playerPosition as THREE.Vector3 | undefined
      const cameraYaw = (window as any).__cameraYaw as number | undefined
      const yaw = cameraYaw !== undefined ? cameraYaw : 0
      const px = playerPos ? playerPos.x : 0
      const pz = playerPos ? playerPos.z : 24

      // Convert yaw to degrees (0 to 360) and invert for scroll direction
      // Yaw in Three.js is clockwise positive or negative depending on context.
      // Let's standardise yaw deg:
      let yawDeg = (yaw * 180) / Math.PI
      yawDeg = (yawDeg + 360) % 360

      // Update horizontal tape position
      if (compassTapeRef.current) {
        // Shift tape so that the current camera heading is centered at 192px
        // Tape coordinates: N (360px), E (540px), S (720px), W (900px), N (1080px)
        const shiftX = centerOffset - (yawDeg * degToPx)
        compassTapeRef.current.style.transform = `translateX(${shiftX}px)`
      }

      // Helper to project relative angle onto the 384px compass view
      const getRelativeOffset = (tx: number, tz: number) => {
        const dx = tx - px
        const dz = tz - pz
        // Calculate bearing angle: -Math.PI to Math.PI (radians)
        // positive clockwise
        let bearing = Math.atan2(dx, dz)
        let bearingDeg = (bearing * 180) / Math.PI
        bearingDeg = (bearingDeg + 360) % 360

        // Calculate shortest difference to camera yaw
        let diff = bearingDeg - yawDeg
        // Keep difference in [-180, 180]
        if (diff > 180) diff -= 360
        if (diff < -180) diff += 360

        // Map to pixel position on the compass header
        // If within the visible compass bounds (approx -90° to 90°)
        if (Math.abs(diff) < 90) {
          return centerOffset + (diff * degToPx)
        }
        return -9999 // Off-screen
      }

      // Draw Main Objective Indicator tick
      if (objectiveIndicatorRef.current) {
        if (objectivePosition) {
          const offset = getRelativeOffset(objectivePosition[0], objectivePosition[2])
          if (offset > -5000) {
            objectiveIndicatorRef.current.style.display = 'block'
            objectiveIndicatorRef.current.style.transform = `translateX(${offset}px) translateX(-50%)`
          } else {
            objectiveIndicatorRef.current.style.display = 'none'
          }
        } else {
          objectiveIndicatorRef.current.style.display = 'none'
        }
      }

      // Draw Custom Waypoint Indicator tick
      if (waypointIndicatorRef.current) {
        if (customWaypoint) {
          const offset = getRelativeOffset(customWaypoint[0], customWaypoint[2])
          if (offset > -5000) {
            waypointIndicatorRef.current.style.display = 'block'
            waypointIndicatorRef.current.style.transform = `translateX(${offset}px) translateX(-50%)`
          } else {
            waypointIndicatorRef.current.style.display = 'none'
          }
        } else {
          waypointIndicatorRef.current.style.display = 'none'
        }
      }

      requestAnimationFrame(update)
    }

    update()
    return () => {
      active = false
    }
  }, [objectivePosition, customWaypoint])

  const accentColor = currentAct === 'act5' ? 'border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)] text-purple-400' : 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-cyan-400'
  const accentBorder = currentAct === 'act5' ? 'border-purple-500' : 'border-cyan-500'

  return (
    <div 
      ref={containerRef}
      className={`fixed top-6 left-1/2 -translate-x-1/2 w-96 h-9 z-40 bg-black/85 border-b-2 ${accentColor} font-mono select-none overflow-hidden backdrop-blur-sm`}
    >
      {/* 1. Scrolling Tape Banner */}
      <div 
        ref={compassTapeRef} 
        className="relative w-[1440px] h-full flex items-center transition-transform duration-75 ease-out"
        style={{ willChange: 'transform' }}
      >
        {/* Render 2 cycles of compass ticks so it wraps infinitely */}
        {Array.from({ length: 2 }).map((_, cycleIndex) => (
          <div key={cycleIndex} className="w-[720px] h-full flex justify-between items-center text-[10px] text-white/50 relative shrink-0">
            {/* Compass Headings (90px spacing = 45 degrees) */}
            <span className="absolute left-[0px] -translate-x-1/2 text-white font-bold text-xs">S</span>
            <span className="absolute left-[45px] -translate-x-1/2">135</span>
            <span className="absolute left-[90px] -translate-x-1/2 text-white font-bold text-xs">SW</span>
            <span className="absolute left-[135px] -translate-x-1/2">225</span>
            <span className="absolute left-[180px] -translate-x-1/2 text-white font-bold text-xs">W</span>
            <span className="absolute left-[225px] -translate-x-1/2">315</span>
            <span className="absolute left-[270px] -translate-x-1/2 text-white font-bold text-xs">NW</span>
            <span className="absolute left-[315px] -translate-x-1/2">45</span>
            <span className="absolute left-[360px] -translate-x-1/2 text-white font-bold text-xs">N</span>
            <span className="absolute left-[405px] -translate-x-1/2">45</span>
            <span className="absolute left-[450px] -translate-x-1/2 text-white font-bold text-xs">NE</span>
            <span className="absolute left-[495px] -translate-x-1/2">135</span>
            <span className="absolute left-[540px] -translate-x-1/2 text-white font-bold text-xs">E</span>
            <span className="absolute left-[585px] -translate-x-1/2">225</span>
            <span className="absolute left-[630px] -translate-x-1/2 text-white font-bold text-xs">SE</span>
            <span className="absolute left-[675px] -translate-x-1/2">315</span>

            {/* Small division ticks (every 15 deg = 30px) */}
            {Array.from({ length: 24 }).map((_, i) => (
              <div 
                key={i} 
                className="absolute h-1.5 w-[1px] bg-white/20 bottom-0" 
                style={{ left: `${i * 30}px` }} 
              />
            ))}
          </div>
        ))}
      </div>

      {/* 2. Floating objective indicators overlaying tape */}
      <div 
        ref={objectiveIndicatorRef}
        className="absolute top-1/2 -translate-y-1/2 z-50 text-[10px] text-yellow-400 font-bold drop-shadow-[0_0_4px_rgba(234,179,8,0.5)] select-none pointer-events-none"
        style={{ display: 'none' }}
      >
        ▼
      </div>

      <div 
        ref={waypointIndicatorRef}
        className="absolute top-1/2 -translate-y-1/2 z-50 text-[10px] text-purple-400 font-bold drop-shadow-[0_0_4px_rgba(168,85,247,0.5)] select-none pointer-events-none"
        style={{ display: 'none' }}
      >
        ◆
      </div>

      {/* 3. Center line indicator (fixed) */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 h-full w-[2px] bg-red-500/80 z-50`} />
    </div>
  )
}
