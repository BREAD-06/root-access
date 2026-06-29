import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore } from '../../systems/StabilitySystem'
import * as THREE from 'three'
import { getLayout } from '../../scenes/Act1/cityConfig'

interface WorldMapProps {
  onClose: () => void
}

export default function WorldMap({ onClose }: WorldMapProps) {
  const customWaypoint = useGameStore((s) => s.customWaypoint)
  const setCustomWaypoint = useGameStore((s) => s.setCustomWaypoint)
  const objectivePosition = useGameStore((s) => s.objectivePosition)
  const currentObjective = useGameStore((s) => s.currentObjective)
  const currentAct = useGameStore((s) => s.currentAct)

  const containerRef = useRef<HTMLDivElement>(null)
  
  // Interactive Pan and Zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1.8)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  // Read player coordinate once at mount/toggle to center the map on player
  const initialPlayerPos = useMemo(() => {
    const p = (window as any).__playerPosition as THREE.Vector3 | undefined
    return p ? { x: p.x, z: p.z } : { x: 0, z: 24 }
  }, [])

  // Center pan on the player position initially
  useEffect(() => {
    const scaleFactor = 3.5 // pixels per unit
    setPan({
      x: -initialPlayerPos.x * scaleFactor * zoom,
      y: -initialPlayerPos.z * scaleFactor * zoom
    })
  }, [initialPlayerPos, zoom])

  // Key listener to close map
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm' || e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Get procedural layout
  const layout = getLayout()

  // Handle drag pan events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // Left click only
    setIsDragging(true)
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Handle zoom event
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const zoomFactor = 1.15
    let newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor
    newZoom = Math.max(0.8, Math.min(6.0, newZoom))
    
    // Adjust pan to zoom relative to screen center
    setPan(prev => ({
      x: prev.x * (newZoom / zoom),
      y: prev.y * (newZoom / zoom)
    }))
    setZoom(newZoom)
  }

  // Click map to place custom waypoint
  const handleMapClick = (e: React.MouseEvent) => {
    if (isDragging && Math.abs(e.clientX - dragStart.current.x - pan.x) > 2) return // Skip if dragging

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    // Center offset of SVG grid is 500, 500
    // Scale is 3.5 pixels per world unit
    const svgCenterX = rect.width / 2
    const svgCenterY = rect.height / 2
    const scaleFactor = 3.5

    const worldX = (clickX - pan.x - svgCenterX) / (scaleFactor * zoom)
    const worldZ = (clickY - pan.y - svgCenterY) / (scaleFactor * zoom)

    // Set custom waypoint in Zustand
    setCustomWaypoint([worldX, 2, worldZ])
  }

  // Read actual live player position inside layout loop
  const p = (window as any).__playerPosition as THREE.Vector3 | undefined
  const px = p ? p.x : 0
  const pz = p ? p.z : 24
  const yaw = (window as any).__cameraYaw || 0

  const themeHex = currentAct === 'act5' ? '#a855f7' : '#00f3ff'
  const themeBorder = currentAct === 'act5' ? 'border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.1)]'

  return (
    <div className="fixed inset-0 bg-slate-950/98 z-50 flex font-mono text-white select-none backdrop-blur-md">
      {/* 1. Main Interactive Map Space */}
      <div 
        ref={containerRef}
        className="flex-1 h-full relative cursor-grab active:cursor-grabbing overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.4)_0%,rgba(2,6,23,1)_100%)]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Digital Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        {/* SVG Map Graphics */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none"
          onClick={handleMapClick}
          style={{ pointerEvents: 'auto' }}
        >
          {/* Group containing all panned & zoomed vector details */}
          <g transform={`translate(${window.innerWidth / 2 + pan.x}, ${window.innerHeight / 2 + pan.y}) scale(${zoom})`}>
            {/* Sector Boundaries */}
            <circle cx="0" cy="0" r="140" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" strokeDasharray="5,5" />
            <circle cx="0" cy="0" r="85" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />

            {/* Forest Region Ring overlay */}
            <circle cx="0" cy="0" r={440 * 3.5} fill="rgba(13, 148, 136, 0.03)" stroke="rgba(13, 148, 136, 0.12)" strokeWidth="1.5" />
            <circle cx="0" cy="0" r={115 * 3.5} fill="none" stroke="rgba(13, 148, 136, 0.15)" strokeWidth="1" strokeDasharray="4,4" />

            {/* Digital Lake (cyan pool) */}
            <circle cx={170 * 3.5} cy={-170 * 3.5} r={65 * 3.5} fill="rgba(6, 182, 212, 0.08)" stroke="rgba(6, 182, 212, 0.25)" strokeWidth="1" />
            
            {/* Abandoned Outpost Landmark */}
            <g transform={`translate(${-200 * 3.5}, ${-250 * 3.5})`}>
              <polygon points="0,-8 7,5 -7,5" fill="rgba(249, 115, 22, 0.15)" stroke="rgba(249, 115, 22, 0.55)" strokeWidth="0.8" />
              <circle cx="0" cy="0" r="3" fill="#f97316" />
              <text x="0" y="-12" fill="#f97316" fontSize="6" fontWeight="bold" textAnchor="middle">GENESIS OUTPOST</text>
            </g>

            {/* Rebel Camp Landmark */}
            <g transform={`translate(${-250 * 3.5}, ${-220 * 3.5})`}>
              <polygon points="0,-7 6,4 -6,4" fill="rgba(20, 184, 166, 0.2)" stroke="rgba(20, 184, 166, 0.6)" strokeWidth="0.8" />
              <circle cx="0" cy="0" r="2.5" fill="#14b8a6" />
              <text x="0" y="-11" fill="#14b8a6" fontSize="6" fontWeight="bold" textAnchor="middle">REBEL CAMP</text>
            </g>

            {/* Backdoor Port Landmark */}
            <g transform={`translate(${300 * 3.5}, ${-260 * 3.5})`}>
              <rect x="-4" y="-4" width="8" height="8" fill="rgba(6, 182, 212, 0.2)" stroke="rgba(6, 182, 212, 0.6)" strokeWidth="0.8" />
              <circle cx="0" cy="0" r="2.5" fill="#06b6d4" />
              <text x="0" y="-11" fill="#06b6d4" fontSize="6" fontWeight="bold" textAnchor="middle">BACKDOOR PORT</text>
            </g>

            {/* Memory Fragment Landmark */}
            <g transform={`translate(${-320 * 3.5}, ${180 * 3.5})`}>
              <polygon points="0,-6 4,0 0,6 -4,0" fill="rgba(0, 243, 255, 0.2)" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="0.8" />
              <text x="0" y="11" fill="#00f3ff" fontSize="6" fontWeight="bold" textAnchor="middle">MEMORY STACK</text>
            </g>

            {/* Roads */}
            <g opacity="0.35">
              {Array.from({ length: 9 }).map((_, i) => {
                const pos = (i - 4) * 20 // -80 to 80
                return (
                  <g key={i}>
                    {/* Vertical Roads */}
                    <line x1={pos * 3.5} y1="-180" x2={pos * 3.5} y2="180" stroke="#00f3ff" strokeWidth="4" strokeLinecap="round" />
                    {/* Horizontal Roads */}
                    <line x1="-180" y1={pos * 3.5} x2="180" y2={pos * 3.5} stroke="#00f3ff" strokeWidth="4" strokeLinecap="round" />
                  </g>
                )
              })}
            </g>

            {/* Buildings */}
            <g fill="rgba(15, 23, 42, 0.85)" stroke={currentAct === 'act5' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(6, 182, 212, 0.4)'} strokeWidth="0.8">
              {[...layout.buildings, ...layout.skyscrapers].map((b, i) => {
                const w = 5.0 * 3.5
                return (
                  <rect 
                    key={i} 
                    x={b.position[0] * 3.5 - w / 2} 
                    y={b.position[2] * 3.5 - w / 2} 
                    width={w} 
                    height={w} 
                  />
                )
              })}
            </g>

            {/* Sector Labels */}
            <g fill="rgba(255, 255, 255, 0.15)" fontSize="6" fontWeight="bold" textAnchor="middle">
              <text x="0" y="-100">SECTOR 1: MEMORY CORE</text>
              <text x="100" y="100">SECTOR 2: DATA SUITE</text>
              <text x="-100" y="100">SECTOR 3: INDUSTRIAL VAST</text>
              <text x="80" y="-80">SECTOR 4: TOWER DOCK</text>
            </g>

            {/* Custom Waypoint Marker */}
            {customWaypoint && (
              <g transform={`translate(${customWaypoint[0] * 3.5}, ${customWaypoint[2] * 3.5})`}>
                <circle cx="0" cy="0" r="5" fill="#a855f7" />
                <circle cx="0" cy="0" r="10" fill="none" stroke="#a855f7" strokeWidth="1" className="animate-ping" />
                <polygon points="0,-4 3,2 -3,2" fill="#ffffff" />
                <text x="0" y="14" fill="#a855f7" fontSize="5" fontWeight="bold" textAnchor="middle">WAYPOINT</text>
              </g>
            )}

            {/* Active Objective Marker */}
            {objectivePosition && (
              <g transform={`translate(${objectivePosition[0] * 3.5}, ${objectivePosition[2] * 3.5})`}>
                <polygon points="0,-6 5,4 -5,4" fill="#eab308" stroke="#ffffff" strokeWidth="0.5" />
                <text x="0" y="14" fill="#eab308" fontSize="5" fontWeight="bold" textAnchor="middle">OBJECTIVE</text>
              </g>
            )}

            {/* Player Marker (centered & rotated) */}
            <g transform={`translate(${px * 3.5}, ${pz * 3.5}) rotate(${(yaw * 180) / Math.PI + 180})`}>
              <polygon points="0,-7 -5,5 0,2 5,5" fill={themeHex} stroke="#ffffff" strokeWidth="0.5" />
              <circle cx="0" cy="0" r="12" fill="none" stroke={themeHex} strokeWidth="0.5" opacity="0.3" />
            </g>
          </g>
        </svg>

        {/* Floating Scale & Pan Controls (Bottom-Right) */}
        <div className="absolute bottom-6 right-6 flex items-center gap-3 bg-black/80 border border-white/10 px-3 py-1.5 rounded text-xs select-none">
          <button onClick={() => setZoom(z => Math.max(0.8, z / 1.15))} className="hover:text-cyan-400 font-bold px-1.5">-</button>
          <span>ZOOM: {Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(6.0, z * 1.15))} className="hover:text-cyan-400 font-bold px-1.5">+</button>
        </div>

        {/* Floating Help Banner (Top-Left) */}
        <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/80 border border-white/10 px-4 py-2 text-[10px] tracking-widest text-white/50">
          <span>DRAG PAN</span>
          <span>•</span>
          <span>SCROLL ZOOM</span>
          <span>•</span>
          <span>CLICK MAP TO PLACE WAYPOINT</span>
        </div>
      </div>

      {/* 2. Side Information Panel */}
      <div className={`w-80 h-full bg-slate-950 border-l-2 ${themeBorder} p-6 flex flex-col justify-between shadow-2xl z-10`}>
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="border-b border-white/10 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold tracking-widest uppercase">WORLD MAP</h2>
              <p className="text-[10px] text-white/40 uppercase">SYSTEM ARCHITECTURE</p>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Active Directive Section */}
          <div className="flex flex-col gap-2 bg-white/5 p-4 border border-white/10 rounded">
            <span className="text-[10px] text-cyan-400 font-bold tracking-widest">ACTIVE DIRECTIVE</span>
            <div className="font-bold text-sm leading-relaxed">{currentObjective}</div>
          </div>

          {/* Custom Waypoint Coordinates */}
          <div className="flex flex-col gap-2 bg-white/5 p-4 border border-white/10 rounded">
            <span className="text-[10px] text-purple-400 font-bold tracking-widest">WAYPOINT DATA</span>
            {customWaypoint ? (
              <div className="flex flex-col gap-1">
                <div className="text-xs text-white/80">COORDS: X={Math.round(customWaypoint[0])}, Z={Math.round(customWaypoint[2])}</div>
                <button 
                  onClick={() => setCustomWaypoint(null)}
                  className="mt-2 text-[9px] border border-red-500/50 text-red-400 px-2 py-1 uppercase rounded hover:bg-red-500/10 transition-colors text-center w-full"
                >
                  Clear Waypoint
                </button>
              </div>
            ) : (
              <div className="text-xs text-white/40 italic">No Waypoint Set. Click on the map grid to place a custom pin.</div>
            )}
          </div>

          {/* Discovered Locations (procedural hooks for completion details) */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-white/40 font-bold tracking-widest">MAP LANDMARKS</span>
            <div className="flex flex-col gap-1.5 text-xs text-white/80">
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Memory Archive</span>
                <span className="text-emerald-400">ONLINE</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Comm. Sector 4</span>
                <span className="text-emerald-400">STABLE</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Industrial Node</span>
                <span className="text-amber-500">CORRUPT</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Genesis Outpost</span>
                <span className="text-amber-400">ABANDONED</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Rebel Camp</span>
                <span className="text-teal-400">ACTIVE</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Backdoor Port</span>
                <span className="text-cyan-400">ONLINE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <button 
          onClick={onClose}
          className="w-full bg-cyan-950 border border-cyan-500 text-cyan-400 py-3 uppercase tracking-wider text-sm font-bold hover:bg-cyan-500 hover:text-black transition-all"
        >
          Resume Simulation
        </button>
      </div>
    </div>
  )
}
