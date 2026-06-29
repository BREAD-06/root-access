import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Vector3 } from 'three'
import gsap from 'gsap'
import CityGrid from './CityGrid'
import RoadNetwork from './RoadNetwork'
import CyberpunkDetails from './CyberpunkDetails'
import MemoryArchive from './MemoryArchive'
import CommunicationTower from './CommunicationTower'
import IndustrialZone from './IndustrialZone'
import Player from '../../components/Player'
import ThirdPersonCamera from '../../components/Player/ThirdPersonCamera'
import NPCManager from '../../components/NPC/NPCManager'
import EnemyManager from '../../components/Enemy/EnemyManager'
import ArchitectHologram from '../../components/World/ArchitectHologram'
import Targeter from '../../components/Player/Targeter'
import { PostProcessingManager } from '../../components/VFX'
import { useGameStore } from '../../systems/StabilitySystem'
import EnvironmentStabilityManager from './EnvironmentStabilityManager'
import Lighting from './Lighting'
import DebrisStorm from './DebrisStorm'
import WorldMarkers from '../../components/Player/WorldMarkers'
import { useCutsceneStore } from '../../systems/CutsceneSystem'
import CutsceneCamera from '../../components/World/CutsceneCamera'
import OpenWorldExpansion from './OpenWorldExpansion'
import MemoryCollectible from '../../components/World/MemoryCollectible'
import RebelCamp from '../../components/World/RebelCamp'



/** Black boot overlay shown before the simulation renders. */
function EnteringSimulation() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '1rem',
        letterSpacing: '0.35em',
      }}
    >
      ENTERING SIMULATION...
    </div>
  )
}

export default function Act1Scene() {
  // Shared position the player writes and the camera follows.
  const playerPos = useRef(new Vector3(0, 2, 24))
  const isConsoleOpen = useGameStore((state) => state.isConsoleOpen)
  
  const startCutscene = useCutsceneStore((state) => state.startCutscene)
  const playedCutscenes = useCutsceneStore((state) => state.playedCutscenes)

  // Trigger Cutscene 1 (The World Appears Normal) on initial mount
  useEffect(() => {
    if (!playedCutscenes['world_normal']) {
      // Small delay to ensure canvas and textures are ready
      const timer = setTimeout(() => {
        startCutscene('world_normal')
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [playedCutscenes, startCutscene])

  // Bullet Time: Slow down physics to 5% speed when the console is open
  const timeStep = isConsoleOpen ? (1 / 60) * 0.05 : 1 / 60

  return (
    <Suspense fallback={<EnteringSimulation />}>
      <Canvas
        shadows="basic"
        camera={{ fov: 60, position: [0, 8, 20] }}
        dpr={[1, 1.5]}
        gl={{ powerPreference: 'high-performance', antialias: false }}
      >
          <EnvironmentStabilityManager />
          <Lighting />
          <Physics timeStep={timeStep}>
            <CityGrid />
            <RoadNetwork />
            <CyberpunkDetails />
            <MemoryArchive />
            <CommunicationTower />
            <IndustrialZone />
            <NPCManager />
            <EnemyManager playerPos={playerPos} />
            <ArchitectHologram />
            <Player targetRef={playerPos} />
            <ThirdPersonCamera targetRef={playerPos} />
            <OpenWorldExpansion />
            <MemoryCollectible />
            <RebelCamp />
          </Physics>
          <PostProcessingManager />
          <CutsceneCamera />
          <Targeter />
          <DebrisStorm />
          <WorldMarkers targetRef={playerPos} />
      </Canvas>
    </Suspense>
  )
}
