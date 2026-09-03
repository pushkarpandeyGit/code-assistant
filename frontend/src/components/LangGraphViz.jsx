// ─────────────────────────────────────────────────────────────
// LangGraphViz.jsx — Animated pipeline diagram
//
// Reads activeTask from context. No props.
// Blue theme. No emojis.
// START → Router → [task node] → END
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'

const NODE_COLORS = {
  explain:    '#60a5fa',  // blue-400
  debug:      '#f87171',  // red-400
  optimize:   '#fbbf24',  // amber-400
  test:       '#34d399',  // emerald-400
  complexity: '#a78bfa',  // violet-400
}

const NODE_LABELS = {
  explain:    'Explain',
  debug:      'Debug',
  optimize:   'Optimize',
  test:       'Test Gen',
  complexity: 'Complexity',
}

// A single pipeline node
function PipeNode({ label, isActive, color }) {
  return (
    <div
      style={{
        borderColor:     isActive ? color : '#2a2a2a',
        color:           isActive ? color : '#383838',
        backgroundColor: isActive ? `${color}12` : 'transparent',
        boxShadow:       isActive ? `0 0 10px ${color}25` : 'none',
      }}
      className="px-2.5 py-1 rounded-md border text-[11px] font-mono transition-all duration-300 whitespace-nowrap select-none"
    >
      {label}
    </div>
  )
}

function Arrow({ isActive }) {
  return (
    <div className={`flex items-center transition-colors duration-300 ${isActive ? 'text-blue-500' : 'text-[#222]'}`}>
      <div className={`h-px w-5 transition-colors duration-300 ${isActive ? 'bg-blue-500' : 'bg-[#222]'}`} />
      <span className="text-[9px] -ml-0.5">&#9654;</span>
    </div>
  )
}

function LangGraphViz({ isRunning }) {
  const { activeTask } = useApp()
  const [step, setStep] = useState(null)   // null | 'start' | 'router' | 'task' | 'end'

  const color = NODE_COLORS[activeTask] || '#60a5fa'
  const label = NODE_LABELS[activeTask] || 'Node'

  useEffect(() => {
    let t1, t2, t3
    if (isRunning) {
      setStep('start')
      t1 = setTimeout(() => setStep('router'), 400)
      t2 = setTimeout(() => setStep('task'),   900)
    } else if (step === 'task') {
      setStep('end')
      t3 = setTimeout(() => setStep(null), 1500)
    }
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [isRunning])

  // A node lights up if it's the current step or any step after it has passed
  const active = (n) => {
    const order = ['start', 'router', 'task', 'end']
    return order.indexOf(step) >= order.indexOf(n)
  }

  const statusText = {
    null:     '',
    start:    'starting...',
    router:   'routing...',
    task:     `${label} running...`,
    end:      'done',
  }[step] || ''

  return (
    <div className="bg-[#161616] border border-[#222] rounded-xl px-4 py-2.5 mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-[#333] font-mono uppercase tracking-widest">LangGraph</span>
        {statusText && (
          <span className={`text-[10px] font-mono transition-colors ${step === 'end' ? 'text-blue-400' : 'text-[#555]'}`}>
            {step === 'end' ? '/ done' : `/ ${statusText}`}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <PipeNode label="START"  isActive={active('start')}  color="#22c55e" />
        <Arrow isActive={active('router')} />
        <PipeNode label="Router" isActive={active('router')} color="#60a5fa" />
        <Arrow isActive={active('task')} />
        <PipeNode label={label}  isActive={active('task')}   color={color} />
        <Arrow isActive={active('end')} />
        <PipeNode label="END"    isActive={active('end')}    color="#22c55e" />
      </div>
    </div>
  )
}

export default LangGraphViz
