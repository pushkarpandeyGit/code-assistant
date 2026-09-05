// ─────────────────────────────────────────────────────────────
// Header.jsx — Top Navigation & Branding Bar
//
// Displays:
// - Hamburger toggle on mobile to open the sidebar
// - Signature <c> coedass branding & tagline explaining what it does
// - Current active mode indicator (Explain, Debug, Optimize, etc.)
// - Live backend connectivity status
// ─────────────────────────────────────────────────────────────

import { useApp } from '../context/AppContext'

const TASK_TITLES = {
  explain:    'Explain Code',
  debug:      'Debug Code',
  optimize:   'Optimize Code',
  test:       'Generate Tests',
  complexity: 'Complexity Analysis',
}

function Header() {
  const { activeTab, activeTask, serverStatus, setSidebarOpen } = useApp()

  const isChat = activeTab === 'chat'
  const currentTitle = isChat ? 'Code Chat' : (TASK_TITLES[activeTask] || 'Analyze')

  const statusColor = {
    online:  'bg-blue-400',
    offline: 'bg-red-500',
    unknown: 'bg-yellow-500',
  }[serverStatus] || 'bg-[#555]'

  return (
    <header className="h-14 bg-[#161616] border-b border-[#222] px-4 flex items-center justify-between flex-shrink-0 z-10 select-none">
      
      {/* ── Left: Hamburger (Mobile) + Logo & Tagline ── */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden p-1.5 rounded-lg text-[#888] hover:text-[#eee] hover:bg-[#222] transition-colors focus:outline-none"
          aria-label="Open sidebar menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2">
          <span className="text-blue-400 font-bold text-lg font-mono tracking-tight">&lt;c&gt;</span>
          <span className="text-[#eee] font-semibold text-base tracking-wide font-sans">coedass</span>
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-4 w-px bg-[#2a2a2a]" />

        {/* Tagline explaining what the platform does */}
        <div className="hidden sm:flex flex-col">
          <span className="text-[11px] text-[#888] font-medium tracking-normal leading-tight">
            AI Code Intelligence & Analysis
          </span>
          <span className="text-[10px] text-[#555] leading-tight">
            Powered by LangGraph & Gemini
          </span>
        </div>
      </div>

      {/* ── Right: Active Mode Pill + Server Status ── */}
      <div className="flex items-center gap-2.5">
        
        {/* Active Mode Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-xs text-[#aaa]">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span className="text-[11px] font-medium text-[#ccc] hidden xs:inline">{currentTitle}</span>
          <span className="text-[11px] font-medium text-[#ccc] xs:hidden">{isChat ? 'Chat' : activeTask}</span>
        </div>

        {/* Live Backend Connection Indicator */}
        <div 
          className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#1a1a1a] border border-[#262626]"
          title={serverStatus === 'online' ? 'FastAPI Backend Online' : 'Backend Offline'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor} ${serverStatus === 'online' ? 'animate-pulse' : ''}`} />
          <span className="text-[10px] text-[#666] font-mono tracking-tight">
            {serverStatus === 'online' ? 'ONLINE' : serverStatus === 'offline' ? 'OFFLINE' : 'CONNECTING'}
          </span>
        </div>
      </div>

    </header>
  )
}

export default Header
