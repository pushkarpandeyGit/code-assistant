// ─────────────────────────────────────────────────────────────
// Sidebar.jsx — Left navigation
//
// Reads activeTab, activeTask from context. No props needed.
// Shows the <c> coedass branding, task list, server status.
// Blue accent (Antigravity blue) — no emojis.
// ─────────────────────────────────────────────────────────────

import { useApp } from '../context/AppContext'

const TASKS = [
  { id: 'explain',    label: 'Explain'        },
  { id: 'debug',      label: 'Debug'          },
  { id: 'optimize',   label: 'Optimize'       },
  { id: 'test',       label: 'Generate Tests' },
  { id: 'complexity', label: 'Complexity'     },
]

function Sidebar() {
  // useApp() reads from AppContext — no props needed
  const { activeTab, setActiveTab, activeTask, setActiveTask, serverStatus } = useApp()

  const handleTask = (taskId) => {
    setActiveTask(taskId)
    setActiveTab('analyze')
  }

  const statusDot = {
    online:  'bg-blue-400',
    offline: 'bg-red-500',
    unknown: 'bg-[#555]',
  }[serverStatus] || 'bg-[#555]'

  return (
    <aside className="w-52 h-full flex flex-col bg-[#161616] border-r border-[#222] flex-shrink-0">

      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-[#222]">
        <div className="flex items-center gap-2">
          <span className="text-[#c0c0c0] font-bold text-lg font-mono tracking-tight">&lt;c&gt;</span>
          <span className="text-[#c0c0c0] font-semibold text-base tracking-wide">coedass</span>
        </div>
        <p className="text-[#444] text-[11px] mt-1 tracking-wide">AI Code Assistant</p>
      </div>

      {/* Analyze tasks */}
      <nav className="px-3 pt-4 flex-1">
        <p className="text-[#383838] text-[10px] font-semibold uppercase tracking-widest px-2 mb-2">Analyze</p>
        <div className="space-y-0.5">
          {TASKS.map(t => {
            const active = activeTab === 'analyze' && activeTask === t.id
            return (
              <button
                key={t.id}
                onClick={() => handleTask(t.id)}
                className={`
                  w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150
                  ${active
                    ? 'bg-blue-500/10 text-blue-400 font-medium'
                    : 'text-[#777] hover:text-[#ccc] hover:bg-[#1e1e1e]'}
                `}
              >
                {t.label}
                {active && <span className="float-right w-1 h-1 rounded-full bg-blue-400 mt-[7px]" />}
              </button>
            )
          })}
        </div>

        <div className="border-t border-[#222] my-3 mx-2" />

        <p className="text-[#383838] text-[10px] font-semibold uppercase tracking-widest px-2 mb-2">Chat</p>
        <button
          onClick={() => setActiveTab('chat')}
          className={`
            w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150
            ${activeTab === 'chat'
              ? 'bg-blue-500/10 text-blue-400 font-medium'
              : 'text-[#777] hover:text-[#ccc] hover:bg-[#1e1e1e]'}
          `}
        >
          Code Chat
          {activeTab === 'chat' && <span className="float-right w-1 h-1 rounded-full bg-blue-400 mt-[7px]" />}
        </button>
      </nav>

      {/* Server status */}
      <div className="px-5 py-4 border-t border-[#222]">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot} ${serverStatus === 'online' ? 'animate-pulse' : ''}`} />
          <span className="text-[#444] text-xs">
            {serverStatus === 'online' ? 'Connected' : serverStatus === 'offline' ? 'Offline' : 'Connecting'}
          </span>
        </div>
        <p className="text-[#2a2a2a] text-[10px] mt-1">Gemini · LangGraph · FastAPI</p>
      </div>
    </aside>
  )
}

export default Sidebar
