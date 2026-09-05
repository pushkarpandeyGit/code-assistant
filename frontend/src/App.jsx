// ─────────────────────────────────────────────────────────────
// App.jsx — Root layout (responsive)
//
// Desktop:  Sidebar always visible (md:flex)
// Mobile:   Sidebar hidden, slides in as overlay when sidebarOpen
//           Dark overlay closes sidebar on tap
// ─────────────────────────────────────────────────────────────

import { AppProvider, useApp } from './context/AppContext'
import Sidebar       from './components/Sidebar'
import Header        from './components/Header'
import Footer        from './components/Footer'
import AnalyzePanel  from './components/AnalyzePanel'
import ChatPanel     from './components/ChatPanel'
import ErrorBoundary from './components/ErrorBoundary'

function AppContent() {
  const { activeTab, sidebarOpen, setSidebarOpen } = useApp()

  return (
    <div className="flex h-screen bg-[#111111] text-[#e5e5e5] overflow-hidden">

      {/* ── Mobile dark overlay ──────────────────────────────
          Shown behind the sidebar on mobile so tapping outside closes it. */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────
          Desktop: always visible (translate-x-0)
          Mobile:  slides in from left when sidebarOpen=true */}
      <div className={`
        fixed md:relative z-50 h-full
        transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0 shadow-2xl shadow-black' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar />
      </div>

      {/* ── Main content layout with Header, Panel, Footer ── */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header with Logo, Tagline, Mode & Server Status */}
        <Header />

        {/* Core Working Area */}
        <main className="flex-1 overflow-hidden min-w-0 flex flex-col relative">
          <ErrorBoundary>
            {activeTab === 'analyze' && <AnalyzePanel />}
            {activeTab === 'chat'    && <ChatPanel />}
          </ErrorBoundary>
        </main>

        {/* Bottom Professional Footer */}
        <Footer />
      </div>
    </div>
  )
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
