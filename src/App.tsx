import { Suspense, lazy } from 'react'
import type { ComponentType } from 'react'
import { useGameStore } from './systems/StabilitySystem'
import type { Act } from './systems/StabilitySystem'

// Global HUD, Console, and Visual Effects overlays
import RealityConsole from './components/Console'
import HUD from './components/HUD'
import { DataRain, GlitchFlash } from './components/VFX'

const PrologueScene = lazy(() => import('./scenes/Prologue'))
const Act1Scene = lazy(() => import('./scenes/Act1'))
const CoreScene = lazy(() => import('./scenes/Core'))

// Map acts 1 through 5 to the same dynamic Act1Scene component to keep the 3D simulation
// loaded seamlessly in memory as stability decays in real-time.
const SCENES: Record<Act, ComponentType> = {
  prologue: PrologueScene,
  act1: Act1Scene,
  act2: Act1Scene,
  act3: Act1Scene,
  act4: Act1Scene,
  act5: Act1Scene,
  core: CoreScene,
}

/** Black boot screen shown while an act's chunk is loading. */
function LoadingScreen() {
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
      INITIALIZING...
    </div>
  )
}

export default function App() {
  const currentAct = useGameStore((state) => state.currentAct)
  const Scene = SCENES[currentAct]

  return (
    <>
      <Suspense fallback={<LoadingScreen />}>
        <Scene />
      </Suspense>

      {/* Global Interface Overlays */}
      <HUD />
      <RealityConsole />
      <DataRain />
      <GlitchFlash />
    </>
  )
}
