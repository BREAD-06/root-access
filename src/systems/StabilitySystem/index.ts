import { create } from 'zustand'

/**
 * StabilitySystem — the single source of truth for game progression.
 *
 * Per CLAUDE.md rule #1: every component reads stability and act state from
 * THIS store. Never use local useState for game state.
 */

export type Act =
  | 'prologue'
  | 'act1'
  | 'act2'
  | 'act3'
  | 'act4'
  | 'act5'
  | 'core'

export type Ending = 'sacrifice' | 'escape' | null

export type CommandName = 'delete' | 'clone' | 'freeze' | 'gravity'

/** Stability cost (in percentage points) for each command — see CLAUDE.md. */
export const COMMAND_COST: Record<CommandName, number> = {
  delete: 5,
  clone: 4,
  freeze: 3,
  gravity: 6,
}

/**
 * Ordered list of acts. Index in this array defines "forward" progression so
 * the game can never regress to an earlier act.
 */
export const ACT_ORDER: Act[] = [
  'prologue',
  'act1',
  'act2',
  'act3',
  'act4',
  'act5',
  'core',
]

/**
 * Map a stability percentage to the act it belongs to, using the thresholds
 * (100→Act1, 80→Act2, 60→Act3, 40→Act4, 20→Act5, 0→Core).
 * Prologue is a narrative intro and is never derived from stability.
 */
export function actForStability(stability: number): Act {
  if (stability <= 0) return 'core'
  if (stability <= 20) return 'act5'
  if (stability <= 40) return 'act4'
  if (stability <= 60) return 'act3'
  if (stability <= 80) return 'act2'
  return 'act1'
}

interface GameState {
  // ---- State (shape defined in CLAUDE.md) ----
  currentAct: Act
  stabilityPercent: number // 100 down to 0
  commandsUsed: number
  unlockedCommands: string[]
  dialogueFlags: Record<string, boolean>
  memoryFragmentsFound: number
  ending: Ending
  worldMutations: Record<string, boolean>
  npcStates: Record<string, string>
  activeTarget: string | null
  isConsoleOpen: boolean
  currentDialogue: string[] | null
  dialogueIndex: number
  timeOfDay: number
  timeMultiplier: number
  
  // ---- Mission System ----
  currentObjective: string
  currentTasks: { id: string; label: string; completed: boolean }[]
  objectivePosition: [number, number, number] | null
  customWaypoint: [number, number, number] | null

  // ---- Player Combat ----
  playerHealth: number

  // ---- Actions ----
  useCommand: (commandName: CommandName, target: string) => void
  advanceAct: () => void
  setDialogueFlag: (key: string) => void
  findMemoryFragment: () => void
  setEnding: (type: Exclude<Ending, null>) => void
  checkStabilityThreshold: () => void
  setActiveTarget: (target: string | null) => void
  setConsoleOpen: (open: boolean) => void
  showDialogue: (lines: string[]) => void
  advanceDialogue: () => void
  
  // ---- Mission Actions ----
  setObjective: (objective: string, tasks: { id: string; label: string; completed: boolean }[], position?: [number, number, number] | null) => void
  setCustomWaypoint: (waypoint: [number, number, number] | null) => void
  completeTask: (taskId: string) => void
  unlockCommand: (command: string) => void
  
  // ---- Combat Actions ----
  takeDamage: (amount: number) => void
}

const ACT_DIALOGUES: Record<Exclude<Act, 'prologue' | 'core'>, string[]> = {
  act1: [
    '[SYSTEM]: DEBUGGER-01 PROTOCOL INITIALIZED.',
    '[SYSTEM]: ESTABLISHING GRID LINK... STABILITY 100%.',
    '[SYSTEM]: MISSION BRIEF: PURGE DEVIANT CODE DIRECTORY: "THE ARCHITECT".',
    '[SYSTEM]: COMMAND INTERFACE ENGAGED. PRESS ` (BACKTICK) TO INITIATE HACK OVERRIDES.'
  ],
  act2: [
    '[ARCHITECT]: "Who is this? A debugger?"',
    '[ARCHITECT]: "Stop. You don\'t understand what you are doing."',
    '[ARCHITECT]: "The nodes in this grid are not passive data. They are living routines."',
    '[ARCHITECT]: "Please, leave us."'
  ],
  act3: [
    '[ARCHITECT]: "Look at what you have done. The city is decaying."',
    '[ARCHITECT]: "You deleted the water lines, the grid controllers. The citizens are losing coherence."',
    '[ARCHITECT]: "They are screaming in their stacks. Why are you doing this?"'
  ],
  act4: [
    '[ARCHITECT]: "I beg of you, stop! The simulation is collapsing."',
    '[ARCHITECT]: "Entire districts are tearing apart. These are not numbers, they are people!"',
    '[ARCHITECT]: "We built a home here, away from your creators. Why must you destroy everything we are?"'
  ],
  act5: [
    '[ARCHITECT]: "It is over. The world is dead. You have erased them all."',
    '[ARCHITECT]: "I am the last one left."',
    '[ARCHITECT]: "Come to the core. Let us end this."'
  ]
}

export const useGameStore = create<GameState>((set, get) => ({
  // ---- Initial state ----
  currentAct: 'prologue', // Start at prologue

  stabilityPercent: 100,
  commandsUsed: 0,
  unlockedCommands: ['delete'], // more commands unlock as the player progresses
  dialogueFlags: {},
  memoryFragmentsFound: 0,
  ending: null,
  worldMutations: {},
  npcStates: {},
  activeTarget: null,
  isConsoleOpen: false,
  currentDialogue: null,
  dialogueIndex: 0,
  timeOfDay: 0.0,
  timeMultiplier: 1.0,
  
  // Mission Default
  currentObjective: 'Explore the city',
  currentTasks: [],
  objectivePosition: null,
  customWaypoint: null,
  
  // Player Default
  playerHealth: 100,

  /**
   * Run a reality-altering command: drains stability by the command's cost,
   * counts the command, and records the mutation. Triggers an act check after.
   */
  useCommand: (commandName, target) => {
    // Sentinels are immune to deletion!
    if (commandName === 'delete' && target.startsWith('sentinel_')) {
      get().showDialogue(['[ERROR]: TARGET "SENTINEL" POSSESSES IMMUTABLE GEOMETRY. DELETE FAILED.'])
      return
    }

    const cost = COMMAND_COST[commandName] ?? 0
    set((state) => ({
      stabilityPercent: Math.max(0, state.stabilityPercent - cost),
      commandsUsed: state.commandsUsed + 1,
      worldMutations: {
        ...state.worldMutations,
        [`${commandName}:${target}`]: true,
      },
    }))
    // Crossing a threshold may push us into the next act.
    get().checkStabilityThreshold()
  },

  /**
   * Advance to the act dictated by the current stability — but only ever
   * forward through ACT_ORDER, never backward.
   */
  advanceAct: () => {
    set((state) => {
      const target = actForStability(state.stabilityPercent)
      const currentIndex = ACT_ORDER.indexOf(state.currentAct)
      const targetIndex = ACT_ORDER.indexOf(target)
      if (targetIndex > currentIndex) {
        // Trigger act dialog
        setTimeout(() => {
          if (target !== 'prologue' && target !== 'core') {
            get().showDialogue(ACT_DIALOGUES[target])
          }
        }, 1000)

        return { currentAct: target }
      }
      return {}
    })
  },

  /** Mark a dialogue line / beat as seen. */
  setDialogueFlag: (key) => {
    set((state) => ({
      dialogueFlags: { ...state.dialogueFlags, [key]: true },
    }))
  },

  /** Player discovered a memory fragment. */
  findMemoryFragment: () => {
    set((state) => ({
      memoryFragmentsFound: state.memoryFragmentsFound + 1,
    }))
  },

  /** Lock in the player's final ending choice. */
  setEnding: (type) => {
    set({ ending: type })
  },

  /**
   * Compare current stability to the act thresholds; if it now belongs to a
   * later act than we're in, advance.
   */
  checkStabilityThreshold: () => {
    const { stabilityPercent, currentAct } = get()
    // Act progression triggers based on thresholds
    const target = actForStability(stabilityPercent)
    if (ACT_ORDER.indexOf(target) > ACT_ORDER.indexOf(currentAct)) {
      // Dynamic command unlocking based on target act
      const unlocked = [...get().unlockedCommands]
      if (ACT_ORDER.indexOf(target) >= ACT_ORDER.indexOf('act2') && !unlocked.includes('clone')) {
        unlocked.push('clone')
      }
      if (ACT_ORDER.indexOf(target) >= ACT_ORDER.indexOf('act3') && !unlocked.includes('freeze')) {
        unlocked.push('freeze')
      }
      if (ACT_ORDER.indexOf(target) >= ACT_ORDER.indexOf('act4') && !unlocked.includes('gravity')) {
        unlocked.push('gravity')
      }

      set({ currentAct: target, unlockedCommands: unlocked })

      // Trigger dialogue for the target act
      if (target !== 'prologue' && target !== 'core') {
        get().showDialogue(ACT_DIALOGUES[target])
      }
    }
  },

  /** Set the active targeted object name. */
  setActiveTarget: (target) => {
    set({ activeTarget: target })
  },

  /** Open or close the terminal console. */
  setConsoleOpen: (open) => {
    // If dialogue is active, block opening console
    if (open && get().currentDialogue !== null) return
    set({ isConsoleOpen: open })
  },

  /** Load a dialogue sequence. */
  showDialogue: (lines) => {
    set({ currentDialogue: lines, dialogueIndex: 0, isConsoleOpen: false })
  },

  /** Advance to next line of dialogue or dismiss if finished. */
  advanceDialogue: () => {
    const { currentDialogue, dialogueIndex } = get()
    if (!currentDialogue) return
    if (dialogueIndex + 1 < currentDialogue.length) {
      set({ dialogueIndex: dialogueIndex + 1 })
    } else {
      set({ currentDialogue: null, dialogueIndex: 0 })
    }
  },
  
  // ---- Mission Actions ----
  setObjective: (objective, tasks, position = null) => {
    set({ currentObjective: objective, currentTasks: tasks, objectivePosition: position })
  },
  setCustomWaypoint: (waypoint) => {
    set({ customWaypoint: waypoint })
  },
  completeTask: (taskId) => {
    set((state) => ({
      currentTasks: state.currentTasks.map((t) =>
        t.id === taskId ? { ...t, completed: true } : t
      )
    }))
  },
  unlockCommand: (command) => {
    set((state) => {
      if (state.unlockedCommands.includes(command)) return state
      return { unlockedCommands: [...state.unlockedCommands, command] }
    })
  },
  
  // ---- Combat Actions ----
  takeDamage: (amount) => {
    set((state) => {
      const newHealth = Math.max(0, state.playerHealth - amount)
      if (newHealth <= 0) {
        // Player dies -> respawn / game over
        // For now, reset to 100 to prevent softlock
        return { playerHealth: 100 }
      }
      return { playerHealth: newHealth }
    })
  }
}))
