import { useRef } from 'react'
import type { RefObject } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../../systems/StabilitySystem'
import { Vector3 } from 'three'

interface WorldMarkersProps {
  /** Reference to the player's world position vector */
  targetRef: RefObject<Vector3>
}

export default function WorldMarkers({ targetRef }: WorldMarkersProps) {
  const objectivePosition = useGameStore((s) => s.objectivePosition)
  const customWaypoint = useGameStore((s) => s.customWaypoint)

  const objTextRef = useRef<HTMLSpanElement>(null)
  const wayTextRef = useRef<HTMLSpanElement>(null)

  const objPosVec = useRef(new Vector3())
  const wayPosVec = useRef(new Vector3())

  useFrame(() => {
    if (!targetRef.current) return
    const pPos = targetRef.current

    // Update floating text indicators directly without React re-render overhead
    if (objectivePosition && objTextRef.current) {
      objPosVec.current.set(objectivePosition[0], objectivePosition[1] + 3.0, objectivePosition[2])
      const dist = Math.round(pPos.distanceTo(objPosVec.current))
      objTextRef.current.innerText = `${dist}m`
    }

    if (customWaypoint && wayTextRef.current) {
      wayPosVec.current.set(customWaypoint[0], customWaypoint[1] + 3.0, customWaypoint[2])
      const dist = Math.round(pPos.distanceTo(wayPosVec.current))
      wayTextRef.current.innerText = `${dist}m`
    }
  })

  return (
    <>
      {/* 3D Main Objective Marker */}
      {objectivePosition && (
        <Html position={[objectivePosition[0], objectivePosition[1] + 3.5, objectivePosition[2]]} center distanceFactor={20}>
          <div className="flex flex-col items-center font-mono select-none pointer-events-none">
            <div className="px-2.5 py-1.5 bg-black/90 border border-yellow-500 rounded text-[9px] text-yellow-400 font-bold whitespace-nowrap shadow-[0_0_15px_rgba(234,179,8,0.25)] flex flex-col items-center gap-0.5">
              <span>MAIN OBJECTIVE</span>
              <span ref={objTextRef} className="text-white text-xs font-black tracking-wider">---</span>
            </div>
            {/* Pointer notch */}
            <div className="w-1.5 h-1.5 bg-yellow-500 rotate-45 border border-black/40 -mt-1 shadow-sm" />
          </div>
        </Html>
      )}

      {/* 3D Custom Waypoint Marker */}
      {customWaypoint && (
        <Html position={[customWaypoint[0], customWaypoint[1] + 3.5, customWaypoint[2]]} center distanceFactor={20}>
          <div className="flex flex-col items-center font-mono select-none pointer-events-none">
            <div className="px-2.5 py-1.5 bg-black/90 border border-purple-500 rounded text-[9px] text-purple-400 font-bold whitespace-nowrap shadow-[0_0_15px_rgba(168,85,247,0.25)] flex flex-col items-center gap-0.5">
              <span>WAYPOINT</span>
              <span ref={wayTextRef} className="text-white text-xs font-black tracking-wider">---</span>
            </div>
            {/* Pointer notch */}
            <div className="w-1.5 h-1.5 bg-purple-500 rotate-45 border border-black/40 -mt-1 shadow-sm" />
          </div>
        </Html>
      )}
    </>
  )
}
