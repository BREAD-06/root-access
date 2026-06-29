import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '../../systems/StabilitySystem'
import { parseCommand } from './CommandParser'
import { playKeySound, playSuccessSound, playErrorSound } from '../../utils/sound'

interface LogEntry {
  text: string
  type: 'info' | 'success' | 'error' | 'input'
}

export default function RealityConsole() {
  const isConsoleOpen = useGameStore((state) => state.isConsoleOpen)
  const setConsoleOpen = useGameStore((state) => state.setConsoleOpen)
  const stabilityPercent = useGameStore((state) => state.stabilityPercent)
  const commandsUsed = useGameStore((state) => state.commandsUsed)
  const unlockedCommands = useGameStore((state) => state.unlockedCommands)
  const activeTarget = useGameStore((state) => state.activeTarget)
  const executeCommand = useGameStore((state) => state.useCommand)

  const [inputVal, setInputVal] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([
    { text: 'SYSTEM SECTOR INITIALIZED. CONNECTED TO ROOT CONSOLE.', type: 'info' },
    { text: 'READY FOR DEBUGGER-01 PROTOCOLS.', type: 'info' },
  ])

  const inputRef = useRef<HTMLInputElement>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  // Listen to global 'q' to toggle console
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow escaping with Escape key as well
      if (e.key === 'Escape') {
        e.preventDefault()
        setConsoleOpen(false)
        // Escape inherently breaks pointer lock, we rely on Q to toggle and lock.
      } else if (e.key.toLowerCase() === 'q') {
        e.preventDefault() // prevent typing 'q'
        if (!isConsoleOpen) {
          setConsoleOpen(true)
          document.exitPointerLock()
        } else {
          setConsoleOpen(false)
          document.body.requestPointerLock().catch(() => {})
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isConsoleOpen, setConsoleOpen])

  // Focus input on open
  useEffect(() => {
    if (isConsoleOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isConsoleOpen])

  // Scroll to bottom of logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, isConsoleOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value)
    playKeySound()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Autocomplete active target on Tab
    if (e.key === 'Tab') {
      e.preventDefault()
      if (!activeTarget) return

      const val = inputVal.trim()
      // Check if they already typed something like "delete" or "delete("
      const match = val.match(/^([a-zA-Z]+)(\()?/)
      if (match) {
        const cmdName = match[1]
        setInputVal(`${cmdName}(${activeTarget})`)
      } else {
        setInputVal(activeTarget)
      }
      playKeySound()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const commandText = inputVal.trim()
    if (!commandText) return

    // 1. Add input to log
    const newLogs = [...logs, { text: `> ${commandText}`, type: 'input' as const }]
    setLogs(newLogs)
    setInputVal('')

    // Developer Test Overrides
    const testStabilityMatch = commandText.match(/^stability\((\d+)\)$/i)
    if (testStabilityMatch) {
      const value = Math.max(0, Math.min(100, parseInt(testStabilityMatch[1], 10)))
      useGameStore.setState({ stabilityPercent: value })
      useGameStore.getState().checkStabilityThreshold()
      setLogs((prev) => [...prev, { text: `[TEST]: SIMULATION STABILITY SET TO ${value}%`, type: 'success' }])
      return
    }

    const testActMatch = commandText.match(/^act\((act[1-5]|core|prologue)\)$/i)
    if (testActMatch) {
      const act = testActMatch[1].toLowerCase() as any
      let stab = 100
      if (act === 'act2') stab = 80
      else if (act === 'act3') stab = 60
      else if (act === 'act4') stab = 40
      else if (act === 'act5') stab = 20
      else if (act === 'core') stab = 0

      useGameStore.setState({ currentAct: act, stabilityPercent: stab })
      const unlocked = ['delete']
      if (['act2', 'act3', 'act4', 'act5'].includes(act)) unlocked.push('clone')
      if (['act3', 'act4', 'act5'].includes(act)) unlocked.push('freeze')
      if (['act4', 'act5'].includes(act)) unlocked.push('gravity')
      useGameStore.setState({ unlockedCommands: unlocked })
      
      setLogs((prev) => [...prev, { text: `[TEST]: JUMPED TO ${act.toUpperCase()} (STABILITY: ${stab}%)`, type: 'success' }])
      return
    }

    const testTimeMatch = commandText.match(/^time\((\d+(\.\d+)?)\)$/i)
    if (testTimeMatch) {
      const multiplier = parseFloat(testTimeMatch[1])
      useGameStore.setState({ timeMultiplier: multiplier })
      setLogs((prev) => [...prev, { text: `[TEST]: TIME MULTIPLIER SET TO ${multiplier}x`, type: 'success' }])
      return
    }

    const testSetTimeMatch = commandText.match(/^set_time\((\d+(\.\d+)?)\)$/i)
    if (testSetTimeMatch) {
      const progress = Math.max(0, Math.min(1.0, parseFloat(testSetTimeMatch[1])))
      useGameStore.setState({ timeOfDay: progress })
      setLogs((prev) => [...prev, { text: `[TEST]: TIME OF DAY SET TO ${Math.round(progress * 100)}% (${progress})`, type: 'success' }])
      return
    }

    // 2. Parse command
    const parsed = parseCommand(commandText, activeTarget)

    if ('error' in parsed) {
      playErrorSound()
      setLogs((prev) => [...prev, { text: `ERROR: ${parsed.error}`, type: 'error' }])
      return
    }

    const { command, target } = parsed

    // 3. Check if command is unlocked
    if (!unlockedCommands.includes(command)) {
      playErrorSound()
      setLogs((prev) => [
        ...prev,
        { text: `ERROR: COMMAND '${command.toUpperCase()}' IS NOT UNLOCKED IN THIS SECTOR.`, type: 'error' },
      ])
      return
    }

    // 4. Run command
    playSuccessSound()
    executeCommand(command, target)

    let outputText = ''
    switch (command) {
      case 'delete':
        outputText = `OBJECT_DELETED: ${target} // STABILITY -5%`
        break
      case 'clone':
        outputText = `OBJECT_CLONED: ${target} // STABILITY -4%`
        break
      case 'freeze':
        outputText = `TARGET_FROZEN: ${target} // STABILITY -3%`
        break
      case 'gravity':
        outputText = `GRAVITY_INVERTED: ${target} // STABILITY -6%`
        break
    }

    setLogs((prev) => [...prev, { text: outputText, type: 'success' }])

    // Close console automatically after a tiny delay
    setTimeout(() => {
      setConsoleOpen(false)
    }, 450)
  }

  return (
    <AnimatePresence>
      {isConsoleOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex flex-col justify-end p-8 font-mono"
          style={{
            background: 'linear-gradient(180deg, rgba(0, 5, 2, 0.94) 0%, rgba(0, 15, 6, 0.97) 100%)',
            color: '#10b981',
            boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8)',
          }}
        >
          {/* Scanline overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.15) 50%, rgba(0, 0, 0, 0.25) 50%)',
              backgroundSize: '100% 4px',
            }}
          />

          {/* Console Header */}
          <div className="border-b border-[#059669] pb-4 mb-6">
            <h1 className="text-xl font-bold tracking-widest text-[#34d399] uppercase">
              DEBUGGER-01 // SYSTEM REALITY CONSOLE
            </h1>
            <div className="flex flex-wrap gap-x-8 gap-y-2 mt-2 text-sm text-[#059669]">
              <div>
                STABILITY:{' '}
                <span className={stabilityPercent <= 40 ? 'text-red-500 animate-pulse font-bold' : 'text-[#34d399]'}>
                  {stabilityPercent}%
                </span>
              </div>
              <div>COMMANDS USED: <span className="text-[#34d399]">{commandsUsed}</span></div>
              <div>
                ACTIVE TARGET:{' '}
                <span className={activeTarget ? 'text-cyan-400 font-bold' : 'text-gray-500'}>
                  {activeTarget ? activeTarget.toUpperCase() : 'NONE'}
                </span>
              </div>
              <div>
                UNLOCKED COMMANDS:{' '}
                <span className="text-[#34d399]">{unlockedCommands.map((c) => `${c}()`).join(', ')}</span>
              </div>
            </div>
          </div>

          {/* Log Window */}
          <div className="flex-1 overflow-y-auto mb-6 pr-4 space-y-2 text-sm max-h-[60vh] custom-scrollbar">
            {logs.map((log, i) => {
              let color = 'text-[#10b981]' // info default
              if (log.type === 'success') color = 'text-cyan-400 font-semibold'
              if (log.type === 'error') color = 'text-red-400 animate-pulse font-semibold'
              if (log.type === 'input') color = 'text-white font-bold'

              return (
                <div key={i} className={`whitespace-pre-wrap ${color}`}>
                  {log.text}
                </div>
              );
            })}
            <div ref={logEndRef} />
          </div>

          {/* Autocomplete suggestion banner */}
          {activeTarget && (
            <div className="text-xs text-cyan-500 mb-2 animate-pulse flex items-center gap-2">
              <span className="bg-cyan-950 px-1 border border-cyan-700 rounded">TAB</span>
              Press TAB to autocomplete current target: <span className="font-bold">{activeTarget}</span>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex items-center border-t border-[#059669] pt-4">
            <span className="text-xl text-[#34d399] font-bold mr-3 animate-pulse">&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter command, e.g. delete(streetlight_a_3) or type 'help'..."
              className="flex-1 bg-transparent text-white text-lg focus:outline-none placeholder-emerald-950 font-bold"
              style={{ caretColor: '#10b981' }}
            />
          </form>

          {/* Guide legend */}
          <div className="mt-4 flex justify-between text-[10px] text-emerald-900 border-t border-emerald-950 pt-2">
            <div>PRESS ` (BACKTICK) OR ESC TO CLOSE CONSOLE</div>
            <div>STABILITY DECAYS GRID STABILITY</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
