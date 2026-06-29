import React, { useEffect, useRef } from 'react'
import { useGameStore } from '../../systems/StabilitySystem'
import WorldObject from '../../components/World/WorldObject'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'

export default function MemoryArchive() {
  const isDeleted = useGameStore((s) => s.worldMutations['delete:corrupted_firewall'])
  const setObjective = useGameStore((s) => s.setObjective)
  const completeTask = useGameStore((s) => s.completeTask)
  const currentTasks = useGameStore((s) => s.currentTasks)
  const unlockCommand = useGameStore((s) => s.unlockCommand)
  const useCommand = useGameStore((s) => s.useCommand)
  
  // Set initial objective on mount
  useEffect(() => {
    setObjective('Reach the Memory Archive', [
      { id: 'talk_citizens', label: 'Talk to 3 citizens (Optional)', completed: false },
      { id: 'reach_archive', label: 'Approach the Archive', completed: false }
    ], [0, 2, 38])
  }, [])

  // Once the wall is deleted, complete the task and update objective
  // Also unlock the freeze command for Act 2
  useEffect(() => {
    if (isDeleted) {
      completeTask('reach_archive')
      unlockCommand('freeze')
      
      // Trigger Cutscene 2 (First Glitch Discovery)
      import('../../systems/CutsceneSystem').then((module) => {
        module.useCutsceneStore.getState().startCutscene('first_glitch')
      })
      
      setTimeout(() => {
        setObjective('Survive the Security Response', [
          { id: 'destroy_drone', label: 'Use delete() on the Enforcer Drone', completed: false },
        ], [0, 15, 60])
      }, 3000)
    }
  }, [isDeleted, completeTask, setObjective, unlockCommand])

  return (
    <group position={[0, 0, 50]}>
      {/* The Archive Building */}
      <WorldObject name="memory_archive" type="building" position={[0, 10, 0]}>
        <mesh>
          <boxGeometry args={[16, 20, 16]} />
          <meshStandardMaterial color="#1a202c" roughness={0.2} metalness={0.8} />
        </mesh>
        
        {/* Glow */}
        <pointLight position={[0, -5, 10]} color="#34d399" intensity={3} distance={20} />
        
        {/* Entrance text */}
        <mesh position={[0, -8, 8.1]}>
          <planeGeometry args={[6, 2]} />
          <meshBasicMaterial color="#34d399" transparent opacity={0.5} />
        </mesh>
      </WorldObject>

      {/* Corrupted Firewall Blocking Path */}
      {!isDeleted && (
        <WorldObject name="corrupted_firewall" type="prop" position={[0, 4, -12]}>
          <mesh>
            <boxGeometry args={[20, 8, 2]} />
            <meshStandardMaterial 
              color="#ef4444" 
              emissive="#7f1d1d" 
              emissiveIntensity={2} 
              wireframe 
            />
          </mesh>
        </WorldObject>
      )}
    </group>
  )
}
