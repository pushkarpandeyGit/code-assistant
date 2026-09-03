// ─────────────────────────────────────────────────────────────
// AppContext.jsx — Global State via React Context API
//
// Context API lets any component in the tree read and update
// shared state WITHOUT passing props down through every level.
//
// How it works:
// 1. createContext()      → creates a "channel"
// 2. <Context.Provider>   → puts data into the channel
// 3. useContext(Context)  → any child reads from the channel
//
// We export a custom hook `useApp()` so components don't need
// to import AppContext directly — just call useApp().
//
// State held here:
// - activeTab    : 'analyze' | 'chat'
// - activeTask   : 'explain' | 'debug' | 'optimize' | 'test' | 'complexity'
// - serverStatus : 'unknown' | 'online' | 'offline'
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useEffect } from 'react'

// Step 1: Create the context channel.
// null is the default — only used if a component is outside a Provider,
// which our custom hook catches and throws a helpful error.
const AppContext = createContext(null)

// ── Provider component ─────────────────────────────────────────
// Wrap your entire app with this. It holds the state and passes
// it to all children via the context channel.
export function AppProvider({ children }) {
  const [activeTab,    setActiveTab]    = useState('analyze')
  const [activeTask,   setActiveTask]   = useState('explain')
  const [serverStatus, setServerStatus] = useState('unknown')

  // Check backend health once when the app first loads
  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then(r => r.ok ? setServerStatus('online') : setServerStatus('offline'))
      .catch(() => setServerStatus('offline'))
  }, [])

  // Everything in `value` is accessible to any child via useApp()
  const value = {
    activeTab,    setActiveTab,
    activeTask,   setActiveTask,
    serverStatus,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

// ── Custom hook ────────────────────────────────────────────────
// Components call: const { activeTask, setActiveTab } = useApp()
// This is cleaner than: useContext(AppContext) everywhere.
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useApp() must be used inside <AppProvider>. Wrap your app in AppProvider.')
  }
  return ctx
}
