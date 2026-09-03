// ─────────────────────────────────────────────────────────────
// Navbar.jsx — Fixed Top Header
//
// This component renders the navigation bar at the top of the page.
// It's "fixed" so it stays visible as you scroll.
//
// What it shows:
// - App branding (logo + name)
// - Tab buttons: Analyze | Code Chat
// - Server health indicator (green = online, red = offline)
// - Tech stack badges
//
// React concepts used:
// - props: parent (App.jsx) passes data down to this child component
//   Props are like function arguments for components.
//   { activeTab, setActiveTab, serverStatus } are all props here.
// ─────────────────────────────────────────────────────────────

function Navbar({ activeTab, setActiveTab, serverStatus }) {

  // ── Tab config ─────────────────────────────────────────────
  // We store the two tabs as an array of objects.
  // This makes it easy to .map() over them and render buttons
  // without repeating JSX. DRY principle (Don't Repeat Yourself).
  const tabs = [
    { id: 'analyze', label: '⚡ Analyze', title: 'One-shot code analysis' },
    { id: 'chat',    label: '💬 Code Chat', title: 'Multi-turn conversation' },
  ]

  // ── Status dot config ──────────────────────────────────────
  // Map each status to a color class and display label.
  const statusConfig = {
    online:  { dot: 'bg-green-400',  text: 'text-green-400',  label: 'Online'  },
    offline: { dot: 'bg-red-400',    text: 'text-red-400',    label: 'Offline' },
    unknown: { dot: 'bg-yellow-400', text: 'text-yellow-400', label: 'Connecting...' },
  }
  const status = statusConfig[serverStatus] || statusConfig.unknown

  return (
    // fixed        → stays at top while scrolling
    // top-0 left-0 right-0 → spans full width
    // z-50         → sits above all other elements
    // border-b     → subtle bottom border as separator
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-800">
      <div className="max-w-screen-2xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* ── Left: Branding ─────────────────────────────── */}
        <div className="flex items-center gap-3">
          {/* Gradient logo circle */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
            AI
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">
              AI Code Assistant
            </h1>
            <p className="text-xs text-gray-500 leading-none mt-0.5">
              Gemini · LangGraph · FastAPI
            </p>
          </div>
        </div>

        {/* ── Center: Tab buttons ────────────────────────── */}
        {/* We .map() over the tabs array to render each button.
            In React, every item in a list needs a unique `key` prop
            so React can track which items changed. We use tab.id here. */}
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              title={tab.title}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200
                ${activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'      // active tab style
                  : 'text-gray-400 hover:text-gray-200'     // inactive tab style
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Right: Server health dot + tech badges ─────── */}
        <div className="flex items-center gap-4">

          {/* Tech stack badges — purely visual, shows resume keywords */}
          <div className="hidden md:flex items-center gap-2">
            {['React', 'FastAPI', 'LangGraph'].map(tech => (
              <span
                key={tech}
                className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700"
              >
                {tech}
              </span>
            ))}
          </div>

          {/* Health status indicator
              animate-pulse → the dot gently pulses when online */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${status.dot} ${serverStatus === 'online' ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-medium ${status.text}`}>
              {status.label}
            </span>
          </div>
        </div>

      </div>
    </nav>
  )
}

export default Navbar
