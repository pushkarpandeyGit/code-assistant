// ─────────────────────────────────────────────────────────────
// App.jsx — Root component
//
// Wraps everything in AppProvider (the context).
// AppContent reads the context to decide which panel to show.
// No props are passed anywhere — every child uses useApp().
// ─────────────────────────────────────────────────────────────

import { AppProvider, useApp } from './context/AppContext'
import Sidebar      from './components/Sidebar'
import AnalyzePanel from './components/AnalyzePanel'
import ChatPanel    from './components/ChatPanel'
import ErrorBoundary from './components/ErrorBoundary'

// Inner component that reads context — must be inside AppProvider
function AppContent() {
  const { activeTab } = useApp()

  return (
    <div className="flex h-screen bg-[#111111] text-[#e5e5e5] overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <ErrorBoundary>
          {activeTab === 'analyze' && <AnalyzePanel />}
          {activeTab === 'chat'    && <ChatPanel />}
        </ErrorBoundary>
      </main>
    </div>
  )
}

// Outer component provides the context to everything inside
function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
