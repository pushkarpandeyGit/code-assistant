// ─────────────────────────────────────────────────────────────
// Sidebar.jsx — Left navigation (with mobile close button)
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
  const { activeTab, setActiveTab, activeTask, setActiveTask, serverStatus, setSidebarOpen } = useApp()

  const handleTask = (taskId) => {
    setActiveTask(taskId)
    setActiveTab('analyze')
    setSidebarOpen(false)  // close sidebar on mobile after selection
  }

  const handleChat = () => {
    setActiveTab('chat')
    setSidebarOpen(false)
  }

  const statusDot = { online: 'bg-blue-400', offline: 'bg-red-500', unknown: 'bg-[#444]' }[serverStatus] || 'bg-[#444]'

  return (
    <aside className="w-52 h-full flex flex-col bg-[#161616] border-r border-[#222] flex-shrink-0">

      {/* Brand + mobile close */}
      <div className="px-5 pt-6 pb-5 border-b border-[#222] flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[#c0c0c0] font-bold text-lg font-mono">&lt;c&gt;</span>
            <span className="text-[#c0c0c0] font-semibold text-base tracking-wide">coedass</span>
          </div>
          <p className="text-[#444] text-[11px] mt-1">AI Code Assistant</p>
        </div>
        {/* Close button — only shows on mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden text-[#444] hover:text-[#888] p-1 -mr-1 mt-0.5"
        >
          ✕
        </button>
      </div>

      {/* Tasks */}
      <nav className="px-3 pt-4 flex-1">
        <p className="text-[#383838] text-[10px] font-semibold uppercase tracking-widest px-2 mb-2">Analyze</p>
        <div className="space-y-0.5">
          {TASKS.map(t => {
            const active = activeTab === 'analyze' && activeTask === t.id
            return (
              <button
                key={t.id}
                onClick={() => handleTask(t.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150
                  ${active ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-[#777] hover:text-[#ccc] hover:bg-[#1e1e1e]'}`}
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
          onClick={handleChat}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150
            ${activeTab === 'chat' ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-[#777] hover:text-[#ccc] hover:bg-[#1e1e1e]'}`}
        >
          Code Chat
          {activeTab === 'chat' && <span className="float-right w-1 h-1 rounded-full bg-blue-400 mt-[7px]" />}
        </button>
      </nav>

      {/* Status */}
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
