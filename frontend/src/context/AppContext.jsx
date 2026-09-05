// ─────────────────────────────────────────────────────────────
// AppContext.jsx — Global State via React Context API
//
// Added: sidebarOpen / setSidebarOpen for mobile hamburger menu
// ─────────────────────────────────────────────────────────────
import { API_BASE } from '../config'
import { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [activeTab,    setActiveTab]    = useState('analyze')
  const [activeTask,   setActiveTask]   = useState('explain')
  const [serverStatus, setServerStatus] = useState('unknown')
  // Controls mobile sidebar open/close
  const [sidebarOpen,  setSidebarOpen]  = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(r => r.ok ? setServerStatus('online') : setServerStatus('offline'))
      .catch(() => setServerStatus('offline'))
  }, [])

  const value = {
    activeTab,    setActiveTab,
    activeTask,   setActiveTask,
    serverStatus,
    sidebarOpen,  setSidebarOpen,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp() must be used inside <AppProvider>')
  return ctx
}
