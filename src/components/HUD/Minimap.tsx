import React, { useEffect, useRef } from 'react'
import { useGameStore } from '../../systems/StabilitySystem'
import * as THREE from 'three'
import { getLayout } from '../../scenes/Act1/cityConfig'

export default function Minimap() {
  const currentAct = useGameStore((s) => s.currentAct)
  const objectivePosition = useGameStore((s) => s.objectivePosition)
  const customWaypoint = useGameStore((s) => s.customWaypoint)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let active = true

    // Retrieve memoized city layout once
    const layout = getLayout()
    const scale = 1.6 // 1.6 pixels per world unit
    const mapSize = 130
    const center = mapSize / 2

    const draw = () => {
      if (!active) return

      const canvas = canvasRef.current
      if (!canvas) {
        requestAnimationFrame(draw)
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        requestAnimationFrame(draw)
        return
      }

      // Read real-time values published to window (rate decoupled from React)
      const playerPos = (window as any).__playerPosition as THREE.Vector3 | undefined
      const cameraYaw = (window as any).__cameraYaw as number | undefined
      const px = playerPos ? playerPos.x : 0
      const pz = playerPos ? playerPos.z : 24
      const yaw = cameraYaw !== undefined ? cameraYaw : 0

      // Collect enemies dynamically from Three.js scene
      const enemies: { x: number; z: number; type: 'normal' | 'elite' | 'boss' }[] = []
      const scene = (window as any).__threeScene as THREE.Scene | undefined
      if (scene) {
        scene.traverse((obj) => {
          if (obj.name && (obj.name.startsWith('enforcer_') || obj.name.startsWith('hunter_') || obj.name.startsWith('sentinel_') || obj.name.startsWith('boss_'))) {
            const pos = new THREE.Vector3()
            obj.getWorldPosition(pos)
            enemies.push({
              x: pos.x,
              z: pos.z,
              type: obj.name.startsWith('boss_') ? 'boss' : (obj.name.includes('hunter') ? 'elite' : 'normal')
            })
          }
        })
      }

      // Clear Canvas
      ctx.clearRect(0, 0, mapSize, mapSize)

      // 1. Create circular mask
      ctx.save()
      ctx.beginPath()
      ctx.arc(center, center, center - 2, 0, Math.PI * 2)
      ctx.clip()

      // Fill background (radar style)
      ctx.fillStyle = 'rgba(3, 7, 18, 0.9)'
      ctx.fillRect(0, 0, mapSize, mapSize)

      // Draw radar background grids
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.04)'
      ctx.lineWidth = 1
      for (let r = 20; r < center; r += 20) {
        ctx.beginPath()
        ctx.arc(center, center, r, 0, Math.PI * 2)
        ctx.stroke()
      }

      // 2. Rotate and translate context for player-centric view
      ctx.save()
      ctx.translate(center, center)
      ctx.rotate(-yaw - Math.PI) // Map rotates in reverse of camera rotation

      // Draw Forest Region (glowing dark green/teal ring)
      const worldCenterX = -px * scale
      const worldCenterZ = -pz * scale
      ctx.fillStyle = 'rgba(13, 148, 136, 0.07)'
      ctx.beginPath()
      ctx.arc(worldCenterX, worldCenterZ, 440 * scale, 0, Math.PI * 2)
      ctx.arc(worldCenterX, worldCenterZ, 115 * scale, 0, Math.PI * 2, true) // hole for central city
      ctx.fill()

      // Draw Digital Lake (cyan pond)
      const lakeX = (170 - px) * scale
      const lakeZ = (-170 - pz) * scale
      ctx.fillStyle = 'rgba(6, 182, 212, 0.15)'
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(lakeX, lakeZ, 65 * scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Draw Abandoned Facility Outpost Landmark (orange warning triangle)
      const outpostX = (-200 - px) * scale
      const outpostZ = (-250 - pz) * scale
      ctx.fillStyle = 'rgba(249, 115, 22, 0.3)'
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.7)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(outpostX, outpostZ - 6)
      ctx.lineTo(outpostX - 6, outpostZ + 6)
      ctx.lineTo(outpostX + 6, outpostZ + 6)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Align landmark label text upright
      ctx.save()
      ctx.translate(outpostX, outpostZ + 12)
      ctx.rotate(yaw + Math.PI) // counteract map rotation
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
      ctx.font = 'bold 7px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('OUTPOST', 0, 0)
      ctx.restore()

      // Draw Rebel Camp Landmark (teal triangle)
      const rebelX = (-250 - px) * scale
      const rebelZ = (-220 - pz) * scale
      ctx.fillStyle = 'rgba(20, 184, 166, 0.25)'
      ctx.strokeStyle = 'rgba(20, 184, 166, 0.75)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(rebelX, rebelZ - 5)
      ctx.lineTo(rebelX - 5, rebelZ + 5)
      ctx.lineTo(rebelX + 5, rebelZ + 5)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Rebel Camp Text label
      ctx.save()
      ctx.translate(rebelX, rebelZ + 11)
      ctx.rotate(yaw + Math.PI)
      ctx.fillStyle = 'rgba(20, 184, 166, 0.65)'
      ctx.font = 'bold 7px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('REBELS', 0, 0)
      ctx.restore()

      // Draw Backdoor Terminal Landmark (cyan square)
      const backdoorX = (300 - px) * scale
      const backdoorZ = (-260 - pz) * scale
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)'
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.75)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.rect(backdoorX - 4, backdoorZ - 4, 8, 8)
      ctx.fill()
      ctx.stroke()

      // Backdoor Text label
      ctx.save()
      ctx.translate(backdoorX, backdoorZ + 11)
      ctx.rotate(yaw + Math.PI)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.65)'
      ctx.font = 'bold 7px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('BACKDOOR', 0, 0)
      ctx.restore()

      // Draw Memory Fragment Landmark (glowing cyan diamond)
      const shardX = (-320 - px) * scale
      const shardZ = (180 - pz) * scale
      ctx.fillStyle = 'rgba(6, 182, 212, 0.3)'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(shardX, shardZ - 4)
      ctx.lineTo(shardX - 4, shardZ)
      ctx.lineTo(shardX, shardZ + 4)
      ctx.lineTo(shardX + 4, shardZ)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // 3. Draw Roads (cyan corridors)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.18)'
      ctx.lineWidth = 8
      for (let i = 0; i <= 8; i++) {
        const pos = (i - 4) * 20 // -80 to 80
        // Vertical roads (world X = pos)
        ctx.beginPath()
        ctx.moveTo((pos - px) * scale, -180)
        ctx.lineTo((pos - px) * scale, 180)
        ctx.stroke()

        // Horizontal roads (world Z = pos)
        ctx.beginPath()
        ctx.moveTo(-180, (pos - pz) * scale)
        ctx.lineTo(180, (pos - pz) * scale)
        ctx.stroke()
      }

      // 4. Draw Buildings (dark frames)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)'
      ctx.strokeStyle = currentAct === 'act5' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(6, 182, 212, 0.25)'
      ctx.lineWidth = 1

      // Combine midrise and skyscraper lists to draw
      const allBuildings = [...layout.buildings, ...layout.skyscrapers]
      for (const b of allBuildings) {
        const bx = b.position[0]
        const bz = b.position[2]
        
        // Culling (skip drawing if too far from player to preserve framerate)
        const dx = bx - px
        const dz = bz - pz
        if (dx * dx + dz * dz < 70 * 70) {
          const w = 5.0 * scale
          ctx.fillRect(dx * scale - w / 2, dz * scale - w / 2, w, w)
          ctx.strokeRect(dx * scale - w / 2, dz * scale - w / 2, w, w)
        }
      }

      // 5. Draw Custom Waypoint
      if (customWaypoint) {
        const wx = customWaypoint[0]
        const wz = customWaypoint[2]
        const dx = (wx - px) * scale
        const dz = (wz - pz) * scale
        
        // Pulsing waypoint circle
        const pulse = 1.0 + Math.sin(performance.now() * 0.007) * 0.2
        ctx.fillStyle = '#a855f7' // bright purple
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)'
        ctx.lineWidth = 2
        
        ctx.beginPath()
        ctx.arc(dx, dz, 4 * pulse, 0, Math.PI * 2)
        ctx.fill()
        
        ctx.beginPath()
        ctx.arc(dx, dz, 8 * pulse, 0, Math.PI * 2)
        ctx.stroke()
      }

      // 6. Draw Main Objective
      if (objectivePosition) {
        const ox = objectivePosition[0]
        const oz = objectivePosition[2]
        const dx = (ox - px) * scale
        const dz = (oz - pz) * scale

        // Golden square for active mission objectives
        const pulse = 1.0 + Math.sin(performance.now() * 0.009) * 0.15
        ctx.fillStyle = '#eab308' // gold
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.5)'
        ctx.lineWidth = 1.5

        ctx.save()
        ctx.translate(dx, dz)
        ctx.rotate(performance.now() * 0.002)
        ctx.fillRect(-3.5 * pulse, -3.5 * pulse, 7 * pulse, 7 * pulse)
        ctx.strokeRect(-5.5 * pulse, -5.5 * pulse, 11 * pulse, 11 * pulse)
        ctx.restore()
      }

      // 7. Draw Enemies (red indicators)
      for (const e of enemies) {
        const dx = (e.x - px) * scale
        const dz = (e.z - pz) * scale

        if (e.type === 'boss') {
          // Large flashing skull/triangle for boss
          ctx.fillStyle = '#ef4444'
          ctx.beginPath()
          ctx.moveTo(dx, dz - 6)
          ctx.lineTo(dx - 6, dz + 6)
          ctx.lineTo(dx + 6, dz + 6)
          ctx.closePath()
          ctx.fill()
        } else if (e.type === 'elite') {
          // Double diamond for elite
          ctx.fillStyle = '#f97316' // orange
          ctx.beginPath()
          ctx.moveTo(dx, dz - 4.5)
          ctx.lineTo(dx - 4.5, dz)
          ctx.lineTo(dx, dz + 4.5)
          ctx.lineTo(dx + 4.5, dz)
          ctx.closePath()
          ctx.fill()
        } else {
          // Normal enemy (red circle)
          ctx.fillStyle = '#ef4444'
          ctx.beginPath()
          ctx.arc(dx, dz, 3.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.restore() // Restore player centering transform

      // 8. Draw Player centered chevron pointing UP (static)
      const accentHex = currentAct === 'act5' ? '#c084fc' : '#00f3ff'
      ctx.fillStyle = accentHex
      
      // Outer subtle ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(center, center, 8, 0, Math.PI * 2)
      ctx.stroke()

      // Directional pointer (chevron)
      ctx.beginPath()
      ctx.moveTo(center, center - 6)
      ctx.lineTo(center - 5, center + 5)
      ctx.lineTo(center, center + 2)
      ctx.lineTo(center + 5, center + 5)
      ctx.closePath()
      ctx.fill()

      ctx.restore() // Restore circular clipping mask

      // 9. Draw outer radar frame and corner tick marks
      ctx.strokeStyle = currentAct === 'act5' ? 'rgba(168, 85, 247, 0.6)' : 'rgba(6, 182, 212, 0.6)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(center, center, center - 1, 0, Math.PI * 2)
      ctx.stroke()

      // Draw horizontal crosshairs around border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.lineWidth = 1
      
      // Top tick
      ctx.beginPath()
      ctx.moveTo(center, 0)
      ctx.lineTo(center, 4)
      ctx.stroke()

      // Bottom tick
      ctx.beginPath()
      ctx.moveTo(center, mapSize)
      ctx.lineTo(center, mapSize - 4)
      ctx.stroke()

      // Left tick
      ctx.beginPath()
      ctx.moveTo(0, center)
      ctx.lineTo(4, center)
      ctx.stroke()

      // Right tick
      ctx.beginPath()
      ctx.moveTo(mapSize, center)
      ctx.lineTo(mapSize - 4, center)
      ctx.stroke()

      // Keep ticking frame-by-frame
      requestAnimationFrame(draw)
    }

    draw()
    return () => {
      active = false
    }
  }, [currentAct, objectivePosition, customWaypoint])

  const frameGlow = currentAct === 'act5' ? 'shadow-[0_0_15px_rgba(168,85,247,0.25)] border-purple-500/50' : 'shadow-[0_0_15px_rgba(6,182,212,0.25)] border-cyan-500/50'

  return (
    <div className={`fixed bottom-6 left-6 w-[130px] h-[130px] rounded-full border-2 ${frameGlow} overflow-hidden backdrop-blur-sm z-40`}>
      <canvas 
        ref={canvasRef} 
        width={130} 
        height={130}
        className="block w-full h-full"
      />
    </div>
  )
}
