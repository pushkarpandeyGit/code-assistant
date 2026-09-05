// ─────────────────────────────────────────────────────────────
// AnalyzePanel.jsx — Responsive one-shot analysis panel
//
// Desktop (md+): editor left | viz+response right (flex-row)
// Mobile (<md):  editor top  | viz+response bottom (flex-col)
//
// Hamburger button (mobile only) opens sidebar.
// API_BASE from config.js (reads VITE_API_URL env var).
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { API_BASE } from '../config'
import CodeEditor    from './CodeEditor'
import LangGraphViz  from './LangGraphViz'
import ResponsePanel from './ResponsePanel'

const TASK_META = {
  explain:    'Explain Code',
  debug:      'Debug',
  optimize:   'Optimize',
  test:       'Generate Tests',
  complexity: 'Complexity Analysis',
}

function AnalyzePanel() {
  const { activeTask, setSidebarOpen } = useApp()

  const [code,     setCode]    = useState('')
  const [language, setLanguage] = useState('python')
  const [result,   setResult]  = useState('')
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState('')

  const taskLabel = TASK_META[activeTask] || 'Analyze'

  const runAnalysis = async () => {
    if (!code.trim()) {
      setError('Add some code first.')
      return
    }

    setLoading(true)
    setResult('')
    setError('')

    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          task: activeTask,
        }),
      })

      if (!response.ok) {
        const e = await response.json().catch(() => ({}))
        throw new Error(e.detail?.message || `Error ${response.status}`)
      }

      const data = await response.json()
      setResult(data.result)

    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot reach backend. Please check the backend connection.'
          : err.message || 'Unexpected error'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="h-full flex flex-col md:flex-row overflow-hidden"
      onKeyDown={e => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && runAnalysis()}
    >

      {/* ── Left / Top: Editor ──────────────────────────── */}
      <div className="flex flex-col border-b md:border-b-0 md:border-r border-[#222] md:w-[45%] h-[50%] md:h-full">

        {/* Mobile header row with hamburger */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#222] flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden flex flex-col gap-1 p-1 mr-1"
              aria-label="Open menu"
            >
              <span className="w-4 h-px bg-[#666]" />
              <span className="w-4 h-px bg-[#666]" />
              <span className="w-4 h-px bg-[#666]" />
            </button>
            <span className="text-sm font-semibold text-[#ccc]">{taskLabel}</span>
          </div>
          <span className="hidden sm:inline text-[11px] text-[#333]">
            <kbd className="bg-[#1e1e1e] border border-[#2a2a2a] px-1.5 py-0.5 rounded text-[10px] text-[#555]">Ctrl+Enter</kbd>
          </span>
        </div>

        {/* Monaco editor */}
        <div className="flex-1 min-h-0 p-2 sm:p-3">
          <CodeEditor code={code} setCode={setCode} language={language} setLanguage={setLanguage} />
        </div>

        {/* Run button */}
        <div className="px-3 pb-3 flex-shrink-0">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200
              ${loading ? 'bg-[#1a1a1a] text-[#444] cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'}`}
          >
            {loading
              ? <><div className="w-4 h-4 border-2 border-[#444] border-t-transparent rounded-full animate-spin" />Running...</>
              : `Run ${taskLabel}`}
          </button>
        </div>
      </div>

      {/* ── Right / Bottom: Viz + Response ──────────────── */}
      <div className="flex-1 h-[50%] md:h-full flex flex-col min-w-0 min-h-0">
        <div className="px-3 sm:px-4 pt-3 flex-shrink-0">
          <LangGraphViz isRunning={loading} />
        </div>
        <div className="flex-1 px-3 sm:px-4 pb-3 min-h-0">
          <ResponsePanel result={result} loading={loading} error={error} task={activeTask} />
        </div>
      </div>
    </div>
  )
}

export default AnalyzePanel
