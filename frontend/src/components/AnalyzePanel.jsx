// ─────────────────────────────────────────────────────────────
// AnalyzePanel.jsx — Resizable Analysis Workspace
//
// Features:
// - Draggable Split-Pane: Freely resize Code Editor vs Response Panel
// - Preset Width Controls: Quick 50/50, 70/30 (Focus Code), 30/70 (Focus Response)
// - Desktop: Smooth side-by-side layout with independent scrollable windows
// - Mobile: Segmented switcher (Editor <-> Response) with auto-transition on run
// - SSE token-by-token streaming from /stream
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { API_BASE } from '../config'
import CodeEditor    from './CodeEditor'
import LangGraphViz  from './LangGraphViz'
import ResponsePanel from './ResponsePanel'

const TASK_META = {
  explain:    'Explain Code',
  debug:      'Debug Code',
  optimize:   'Optimize Code',
  test:       'Generate Tests',
  complexity: 'Complexity Analysis',
}

function AnalyzePanel() {
  const { activeTask } = useApp()

  const [code,       setCode]       = useState('')
  const [language,   setLanguage]   = useState('python')
  const [result,     setResult]     = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  // Mobile active tab: 'editor' | 'response'
  const [mobileTab,  setMobileTab]  = useState('editor')

  // ── Resizable Split-Pane State ─────────────────────────────
  // splitRatio: percentage of width allocated to the Left (Editor) column
  const [splitRatio, setSplitRatio] = useState(48)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)

  const taskLabel = TASK_META[activeTask] || 'Analyze'

  // ── Mouse Dragging for Resizing ────────────────────────────
  const handleMouseDown = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const relativeX = e.clientX - rect.left
      const percentage = (relativeX / rect.width) * 100

      // Constrain split ratio between 22% and 78% so neither panel collapses completely
      if (percentage >= 22 && percentage <= 78) {
        setSplitRatio(percentage)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // ── Run Analysis Streaming ─────────────────────────────────
  const runAnalysis = async () => {
    if (!code.trim()) {
      setError('Please paste or write some code first.')
      return
    }

    setLoading(true)
    setResult('')
    setError('')
    // On mobile screens, auto-switch to response tab to view live progress
    setMobileTab('response')

    try {
      const response = await fetch(`${API_BASE}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, task: activeTask }),
      })

      if (!response.ok) {
        const e = await response.json().catch(() => ({}))
        throw new Error(e.detail?.message || `Error ${response.status}`)
      }

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let done   = false

      while (!done) {
        const { value, done: sd } = await reader.read()
        if (sd) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const str = line.slice(6).trim()
          if (!str) continue

          try {
            const { t } = JSON.parse(str)
            if (t === '[DONE]') {
              done = true
              break
            }
            if (t?.startsWith('[ERROR]')) throw new Error(t.replace('[ERROR] ', ''))
            setResult(prev => prev + t)
          } catch (pe) {
            if (pe.message) throw pe
          }
        }
      }
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot reach backend server. Is FastAPI running on port 8000?'
          : err.message || 'Unexpected error'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runAnalysis()
  }

  return (
    <div 
      ref={containerRef}
      className={`h-full flex flex-col md:flex-row overflow-hidden ${isDragging ? 'select-none cursor-col-resize' : ''}`}
      onKeyDown={handleKeyDown}
    >

      {/* ── Mobile Tab Switcher (< md) ─────────────────────────── */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 bg-[#141414] border-b border-[#222] flex-shrink-0">
        <div className="flex p-1 bg-[#1a1a1a] rounded-lg border border-[#262626] w-full">
          <button
            onClick={() => setMobileTab('editor')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mobileTab === 'editor'
                ? 'bg-blue-600 text-white'
                : 'text-[#888] hover:text-[#ccc]'
            }`}
          >
            Code Editor
          </button>
          <button
            onClick={() => setMobileTab('response')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
              mobileTab === 'response'
                ? 'bg-blue-600 text-white'
                : 'text-[#888] hover:text-[#ccc]'
            }`}
          >
            <span>coedass Response</span>
            {loading && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
            {!loading && result && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
          </button>
        </div>
      </div>

      {/* ── Left Column: Code Editor ───────────────────────────── */}
      <div 
        style={{ width: undefined }}
        className={`
          flex-col border-b md:border-b-0 border-[#222] 
          h-full min-w-0
          ${mobileTab === 'editor' ? 'flex flex-1' : 'hidden md:flex'}
        `}
        // Apply inline width on desktop screens
        ref={(el) => {
          if (el && window.innerWidth >= 768) {
            el.style.width = `${splitRatio}%`
          }
        }}
      >

        {/* Editor Top Bar with Quick Presets */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#222] flex-shrink-0 bg-[#141414]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#bbb] tracking-wide">{taskLabel}</span>
          </div>

          {/* Panel Size Quick Presets (Desktop) */}
          <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-[#555] font-mono">
            <span>Layout:</span>
            <button
              onClick={() => setSplitRatio(68)}
              title="Expand Code Editor (70% width)"
              className={`px-1.5 py-0.5 rounded border transition-colors ${
                splitRatio > 60
                  ? 'border-blue-500/50 bg-blue-500/15 text-blue-400'
                  : 'border-[#262626] bg-[#1a1a1a] text-[#777] hover:text-[#bbb]'
              }`}
            >
              Code 70%
            </button>
            <button
              onClick={() => setSplitRatio(50)}
              title="Equal Split (50% each)"
              className={`px-1.5 py-0.5 rounded border transition-colors ${
                splitRatio >= 45 && splitRatio <= 55
                  ? 'border-blue-500/50 bg-blue-500/15 text-blue-400'
                  : 'border-[#262626] bg-[#1a1a1a] text-[#777] hover:text-[#bbb]'
              }`}
            >
              50 / 50
            </button>
            <button
              onClick={() => setSplitRatio(32)}
              title="Expand Response Panel (70% width)"
              className={`px-1.5 py-0.5 rounded border transition-colors ${
                splitRatio < 40
                  ? 'border-blue-500/50 bg-blue-500/15 text-blue-400'
                  : 'border-[#262626] bg-[#1a1a1a] text-[#777] hover:text-[#bbb]'
              }`}
            >
              Output 70%
            </button>
          </div>

          <span className="hidden sm:inline text-[11px] text-[#444]">
            <kbd className="bg-[#1a1a1a] border border-[#2a2a2a] px-1.5 py-0.5 rounded text-[10px] text-[#666]">Ctrl+Enter</kbd> to run
          </span>
        </div>

        {/* Monaco Editor Scrollable Area */}
        <div className="flex-1 min-h-0 p-3 bg-[#111111]">
          <CodeEditor
            code={code}
            setCode={setCode}
            language={language}
            setLanguage={setLanguage}
          />
        </div>

        {/* Run Action Area */}
        <div className="p-3 border-t border-[#222] bg-[#141414] flex-shrink-0">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className={`
              w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2
              transition-all duration-200 cursor-pointer
              ${loading
                ? 'bg-[#1e1e1e] text-[#555] cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 active:scale-[0.99]'}
            `}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#555] border-t-transparent rounded-full animate-spin" />
                <span>Processing with LangGraph...</span>
              </>
            ) : (
              <span>Run {taskLabel}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Draggable Divider Bar (Desktop Only) ──────────────── */}
      <div
        onMouseDown={handleMouseDown}
        className={`
          hidden md:flex items-center justify-center w-2.5 bg-[#141414] hover:bg-blue-600/20
          cursor-col-resize transition-colors border-x border-[#222] z-10 select-none
          ${isDragging ? 'bg-blue-600/30 border-blue-500/50' : ''}
        `}
        title="Drag left or right to resize panels"
      >
        {/* Subtle Grip Handle Dots */}
        <div className="flex flex-col gap-1 items-center">
          <span className="w-0.5 h-0.5 rounded-full bg-[#555]" />
          <span className="w-0.5 h-0.5 rounded-full bg-[#555]" />
          <span className="w-0.5 h-0.5 rounded-full bg-[#555]" />
        </div>
      </div>

      {/* ── Right Column: Pipeline Viz & Scrollable Response ─── */}
      <div 
        style={{ width: undefined }}
        className={`
          flex-1 h-full flex-col min-w-0 min-h-0 p-3 sm:p-4 bg-[#111111]
          ${mobileTab === 'response' ? 'flex' : 'hidden md:flex'}
        `}
        ref={(el) => {
          if (el && window.innerWidth >= 768) {
            el.style.width = `${100 - splitRatio}%`
          }
        }}
      >

        {/* LangGraph Pipeline Status */}
        <div className="flex-shrink-0">
          <LangGraphViz isRunning={loading} />
        </div>

        {/* coedass Response Scrollable Window */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <ResponsePanel
            result={result}
            loading={loading}
            error={error}
            task={activeTask}
          />
        </div>
      </div>

    </div>
  )
}

export default AnalyzePanel