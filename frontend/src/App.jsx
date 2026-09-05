// ─────────────────────────────────────────────────────────────
// App.jsx — Fluid Website Layout
//
// Desktop: Sticky sidebar + sticky header + flowing scrollable website
// Mobile:  Slide-over sidebar + fluid continuous scrolling
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
    <div className="flex min-h-screen bg-[#111111] text-[#e5e5e5] relative">

      {/* ── Mobile Backdrop ─────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/75 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Left Sidebar (Sticky on desktop, drawer on mobile) ── */}
      <div className={`
        fixed md:sticky top-0 z-50 h-screen
        transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0 shadow-2xl shadow-black' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar />
      </div>

      {/* ── Main Scrollable Content Area ────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 bg-[#111111]">
        
        {/* Sticky Header at top of workspace */}
        <div className="sticky top-0 z-30">
          <Header />
        </div>

        {/* Core Working Area */}
        <main className="flex-1 min-w-0 flex flex-col">
          <ErrorBoundary>
            {activeTab === 'analyze' && <AnalyzePanel />}
            {activeTab === 'chat'    && <ChatPanel />}
          </ErrorBoundary>
        </main>

        {/* Application Footer */}
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
