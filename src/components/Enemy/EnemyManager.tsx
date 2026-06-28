import React, { useMemo } from 'react'
import { useGameStore } from '../../systems/StabilitySystem'
import Enforcer from './Enforcer'
import Hunter from './Hunter'
import Sentinel from './Sentinel'
import type { Vector3 } from 'three'

interface EnemyManagerProps {
  playerPos: React.MutableRefObject<Vector3>
}

// Hardcoded enemy spawns based on acts/missions
export default function EnemyManager({ playerPos }: EnemyManagerProps) {
  const currentAct = useGameStore((s) => s.currentAct)
  const mutations = useGameStore((s) => s.worldMutations)
  const isDeleted = mutations['delete:corrupted_firewall']
  const setObjective = useGameStore((s) => s.setObjective)
  const completeTask = useGameStore((s) => s.completeTask)

  // In Act 1, the Architect spawns the first Enforcer drone after the firewall is deleted
  // When it is destroyed, progress to Act 2's tower mission.
  React.useEffect(() => {
    if (mutations['delete:enforcer_01']) {
      completeTask('destroy_drone')
      setTimeout(() => {
        setObjective('Investigate Communication Tower', [
          { id: 'reach_tower', label: 'Reach the tower in Sector 4', completed: false },
          { id: 'climb_tower', label: 'Climb the moving platforms', completed: false },
          { id: 'use_freeze', label: 'Use freeze() to stabilize platforms', completed: false }
        ], [80, 10, -40])
      }, 3000)
    }
  }, [mutations['delete:enforcer_01'], completeTask, setObjective])
  
  const enemies = useMemo(() => {
    const list: { id: string, type: 'enforcer' | 'hunter' | 'sentinel', position: [number, number, number] }[] = []
    
    // Act 1 Tutorial Drone (Spawns after player learns delete)
    if (isDeleted && currentAct === 'act1') {
      list.push({ id: 'enforcer_01', type: 'enforcer', position: [0, 15, 60] })
    }

    // Act 2 Drones defending the tower
    if (currentAct === 'act2') {
      list.push({ id: 'enforcer_02', type: 'enforcer', position: [60, 20, -60] })
      list.push({ id: 'hunter_01', type: 'hunter', position: [75, 2, -60] })
      list.push({ id: 'hunter_02', type: 'hunter', position: [85, 2, -65] })
    }

    // Act 3/4 Drones
    if (currentAct === 'act3' || currentAct === 'act4') {
      list.push({ id: 'enforcer_04', type: 'enforcer', position: [30, 20, 30] })
      list.push({ id: 'sentinel_01', type: 'sentinel', position: [-80, 2, 70] }) // Industrial Zone guard
      list.push({ id: 'sentinel_02', type: 'sentinel', position: [-90, 2, 60] })
    }

    return list
  }, [currentAct, isDeleted])

  return (
    <group>
      {enemies.map((enemy: any) => {
        if (enemy.type === 'enforcer') {
          return (
            <Enforcer 
              key={enemy.id} 
              id={enemy.id} 
              startPosition={enemy.position} 
              playerPos={playerPos} 
            />
          )
        }
        if (enemy.type === 'hunter') {
          return (
            <Hunter 
              key={enemy.id} 
              id={enemy.id} 
              startPosition={enemy.position} 
              playerPos={playerPos} 
            />
          )
        }
        if (enemy.type === 'sentinel') {
          return (
            <Sentinel 
              key={enemy.id} 
              id={enemy.id} 
              startPosition={enemy.position} 
              playerPos={playerPos} 
            />
          )
        }
        return null
      })}
    </group>
  )
}
