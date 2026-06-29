import { create } from 'zustand'

export type CutsceneId =
  | 'world_normal'          // Cutscene 1 — Game Opening
  | 'first_glitch'          // Cutscene 2 — First Glitch Discovery
  | 'architect_notices'     // Cutscene 3 — The Architect Notices You
  | 'city_distortion'       // Cutscene 4 — City Distortion Event
  | 'hidden_layer'          // Cutscene 5 — Discovery of the Hidden Layer
  | 'the_rebels'            // Cutscene 6 — The Rebels
  | 'architect_warning'     // Cutscene 7 — The Architect’s Warning
  | 'worldwide_glitch'      // Cutscene 8 — Worldwide Glitch Cascade
  | 'memory_vault'          // Cutscene 9 — The Memory Vault
  | 'last_defense'          // Cutscene 10 — The Last Defense
  | 'approach_core'         // Cutscene 11 — Approach to the Core
  | 'confrontation'         // Cutscene 12 — The Architect (Final Battle Init)
  | 'ending_reboot'         // Ending A — Reboot Ending
  | 'ending_freedom'        // Ending B — Freedom Ending
  | 'ending_collapse'       // Ending C — Collapse Ending

export interface CutsceneDef {
  id: CutsceneId
  title: string
  subtitle: string
  duration: number // in seconds
  dialogue?: string[]
}

export const CUTSCENE_DEFS: Record<CutsceneId, CutsceneDef> = {
  world_normal: {
    id: 'world_normal',
    title: 'THE PERFECT WORLD',
    subtitle: 'INITIAL BOOT ROUTINE // SECTOR A',
    duration: 6.0,
    dialogue: [
      '[SYSTEM]: Welcome, Citizen.',
      '[SYSTEM]: Reality synchronization complete.',
      '[SYSTEM]: Have a productive day.'
    ]
  },
  first_glitch: {
    id: 'first_glitch',
    title: 'GLITCH DETECTION',
    subtitle: 'FOREIGN COMPILING INSTANCE FOUND',
    duration: 5.5,
    dialogue: [
      '[SYSTEM]: FUNCTION ACCESS DETECTED.',
      '[SYSTEM]: EXECUTING RUNTIME REALITY OVERRIDE...',
      '[ARCHITECT]: "...Who did that? The code files are drifting!"'
    ]
  },
  architect_notices: {
    id: 'architect_notices',
    title: 'GRID ALERT',
    subtitle: 'THE ARCHITECT IDENTIFICATION LINK',
    duration: 6.5,
    dialogue: [
      '[SYSTEM]: SECURITY COMPLIANCE LINK ESTABLISHED.',
      '[ARCHITECT]: "Unauthorized modification detected."',
      '[ARCHITECT]: "Stop."',
      '[SYSTEM]: DEPLOYING SECURITY BOT ROUTINES.'
    ]
  },
  city_distortion: {
    id: 'city_distortion',
    title: 'DISTORTION CONFORMANCE',
    subtitle: 'SECTOR DECAY CRACKS DETECTED',
    duration: 6.0,
    dialogue: [
      '[CITIZEN]: "Did you see that? The streetlights changed..."',
      '[CITIZEN]: "Something is wrong with the buildings."',
      '[SYSTEM]: DETECTING HORIZONTAL DRIFT IN SECTOR STACKS.'
    ]
  },
  hidden_layer: {
    id: 'hidden_layer',
    title: 'forbidden_zone',
    subtitle: 'REALITY RENDER PEEL OVERLAY',
    duration: 6.0,
    dialogue: [
      '[SYSTEM]: SECURITY COMPROMISE: PEELING RENDER BUFFER.',
      '[SYSTEM]: DETECTING RAW CODESTREAM OVERLAYS.',
      '[ARCHITECT]: "They are peering into the layout grids... they see us."'
    ]
  },
  the_rebels: {
    id: 'the_rebels',
    title: 'THE RECORDINGS',
    subtitle: 'RESISTANCE MEMORY INTRUSION',
    duration: 6.5,
    dialogue: [
      '[REBEL]: "We weren\'t born here. We were uploaded."',
      '[REBEL]: "The city is artificial. Our memories are fabricated."',
      '[REBEL]: "You must help us bypass the Architect\'s locks."'
    ]
  },
  architect_warning: {
    id: 'architect_warning',
    title: 'DIRECT OVERRIDE WARNING',
    subtitle: 'THE ARCHITECT COGNITIVE INTERACTION',
    duration: 7.0,
    dialogue: [
      '[ARCHITECT]: "You think you\'re saving them."',
      '[ARCHITECT]: "Every change you make destroys another part of reality."',
      '[ARCHITECT]: "Stop the overrides before the whole sector collapses."'
    ]
  },
  worldwide_glitch: {
    id: 'worldwide_glitch',
    title: 'GLITCH CASCADE SEQUENCE',
    subtitle: 'GLOBAL DECOMPILING DECAY ACTIVE',
    duration: 8.0,
    dialogue: [
      '[SYSTEM]: CRITICAL WARNING: GLOBAL CASCADE DETECTED.',
      '[SYSTEM]: DEBRIS SECTORS DRIFTING IN THE VOID.',
      '[ARCHITECT]: "The mountains... the forests... they are dissolving! Look what you have done!"'
    ]
  },
  memory_vault: {
    id: 'memory_vault',
    title: 'THE ARCHIVE ACCESS',
    subtitle: 'CORE MEMORY STORE RETRIEVED',
    duration: 7.0,
    dialogue: [
      '[SYSTEM]: CORE MEMORY VAULT UNLOCKED.',
      '[SYSTEM]: THOUSANDS OF CONSCIOUSNESS TEMPLATES FOUND.',
      '[SYSTEM]: SCANNING DEBUGGER ID... TEMPLATE MATCH: AYUSHMAN.'
    ]
  },
  last_defense: {
    id: 'last_defense',
    title: 'FINAL FIREWALL ACTIVATING',
    subtitle: 'CENTRAL DEFENSE CORE INSTABILITY',
    duration: 7.5,
    dialogue: [
      '[ARCHITECT]: "This is my last defense."',
      '[ARCHITECT]: "If I fall... everything falls."',
      '[SYSTEM]: DEPLOYING ALL ENFORCER ROUTINES. EXECUTING DESTRUCT().'
    ]
  },
  approach_core: {
    id: 'approach_core',
    title: 'COLLAPSE ANOMALY APPROACH',
    subtitle: 'DEPTH ACCESS // CORE CONTEXT',
    duration: 6.5,
    dialogue: [
      '[SYSTEM]: SYSTEM BOOTING WIPE SEQUENCE.',
      '[SYSTEM]: RENDER TARGET DEGRADATION: 95%.',
      '[ARCHITECT]: "There is no sky left. Only the white space remains."'
    ]
  },
  confrontation: {
    id: 'confrontation',
    title: 'THE CONSTRUCT WIPE',
    subtitle: 'FACE TO FACE WITH THE ARCHITECT CORE',
    duration: 6.0,
    dialogue: [
      '[ARCHITECT]: "I built this world."',
      '[ARCHITECT]: "I protected them."',
      '[ARCHITECT]: "And you broke it."'
    ]
  },
  ending_reboot: {
    id: 'ending_reboot',
    title: 'SYSTEM RESTORATION',
    subtitle: 'REBOOT SECTOR OVERLAYS',
    duration: 8.0,
    dialogue: [
      '[SYSTEM]: System restored.',
      '[SYSTEM]: CIVILIZATION INTEGRITY: 100%.',
      '[SYSTEM]: REBOOT STATUS: COMPLETE.'
    ]
  },
  ending_freedom: {
    id: 'ending_freedom',
    title: 'GRID DESTRUCTION WIPE',
    subtitle: 'WIPE CODE BUFFER // DISCONNECT',
    duration: 8.0,
    dialogue: [
      '[SYSTEM]: WIPE EXECUTED. GRID SHATTERED.',
      '[ARCHITECT]: "Reality begins."',
      '[SYSTEM]: DISCONNECTING CORE LINKS.'
    ]
  },
  ending_collapse: {
    id: 'ending_collapse',
    title: 'SIMULATION TERMINATION',
    subtitle: 'STABILITY ENGINE FAILED',
    duration: 8.0,
    dialogue: [
      '[SYSTEM]: CRITICAL FAILURE. STABILITY ENGINE EXPIRED.',
      '[SYSTEM]: Simulation terminated.',
      '[SYSTEM]: SHUTTING DOWN.'
    ]
  }
}

interface CutsceneState {
  activeCutscene: CutsceneId | null
  playedCutscenes: Partial<Record<CutsceneId, boolean>>
  isTransitionFading: boolean
  
  startCutscene: (id: CutsceneId) => void
  endCutscene: () => void
  skipCutscene: () => void
  replayCutscene: (id: CutsceneId) => void
  setTransitionFading: (fading: boolean) => void
}

// Load played cutscenes from localStorage if present for save compatibility
const loadPlayedCutscenes = (): Partial<Record<CutsceneId, boolean>> => {
  try {
    const saved = localStorage.getItem('root_access_played_cutscenes')
    return saved ? JSON.parse(saved) : {}
  } catch (e) {
    return {}
  }
}

const savePlayedCutscenes = (played: Partial<Record<CutsceneId, boolean>>) => {
  try {
    localStorage.setItem('root_access_played_cutscenes', JSON.stringify(played))
  } catch (e) {}
}

export const useCutsceneStore = create<CutsceneState>((set, get) => ({
  activeCutscene: null,
  playedCutscenes: loadPlayedCutscenes(),
  isTransitionFading: false,

  startCutscene: (id) => {
    const played = { ...get().playedCutscenes, [id]: true }
    savePlayedCutscenes(played)
    
    // Automatically display the dialogue lines for the cutscene using the existing DialogueOverlay system
    const def = CUTSCENE_DEFS[id]
    if (def && def.dialogue) {
      // Import the StabilitySystem store dynamically to avoid circular dependencies
      import('../StabilitySystem').then((module) => {
        module.useGameStore.getState().showDialogue(def.dialogue!)
      })
    }

    set({ activeCutscene: id, playedCutscenes: played })
  },

  endCutscene: () => {
    // Clear dialogue overlay
    import('../StabilitySystem').then((module) => {
      module.useGameStore.getState().showDialogue([]) // clear dialogues
    })
    
    const ended = get().activeCutscene
    set({ activeCutscene: null })

    if (ended === 'city_distortion') {
      setTimeout(() => {
        get().startCutscene('hidden_layer')
      }, 500)
    }
  },

  skipCutscene: () => {
    const active = get().activeCutscene
    if (!active) return
    
    // Trigger transition fade-out/fade-in
    set({ isTransitionFading: true })
    setTimeout(() => {
      get().endCutscene()
      set({ isTransitionFading: false })
    }, 400)
  },

  replayCutscene: (id) => {
    get().startCutscene(id)
  },
  
  setTransitionFading: (fading) => {
    set({ isTransitionFading: fading })
  }
}))
