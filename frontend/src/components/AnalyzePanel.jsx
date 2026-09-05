// ─────────────────────────────────────────────────────────────
// AnalyzePanel.jsx — Resizable & Scrollable Analysis Workspace
//
// Features:
// - Draggable Split-Pane Divider: Freely resize Code Editor vs Response
// - Layout Presets: Code 70% | 50/50 | Output 70%
// - Unified Single-Window Flow: Editor, LangGraph Pipeline, and Response
//   all live in the SAME window (no separate screens or popups)
// - Fluid Website Scrolling: Smoothly flows down the page
// - Auto-scroll on run: Smoothly brings response into view when processing
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

  // ── Resizable Split-Pane State (Desktop) ───────────────────
  const [splitRatio, setSplitRatio] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const [isDesktop,  setIsDesktop]  = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true)

  const containerRef = useRef(null)
  const responseRef  = useRef(null)

  const taskLabel = TASK_META[activeTask] || 'Analyze'

  // Monitor screen width changes
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ── Dragging logic for left/right resize ───────────────────
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

      // Keep width between 22% and 78% so both remain visible
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

  // ── Streaming Analysis Execution ───────────────────────────
  const runAnalysis = async () => {
    if (!code.trim()) {
      setError('Please paste or write some code first.')
      return
    }

    setLoading(true)
    setResult('')
    setError('')

    // On mobile, smoothly scroll down so user sees pipeline & response
    if (!isDesktop && responseRef.current) {
      setTimeout(() => {
        responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }

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
      className={`w-full flex flex-col md:flex-row p-3 md:p-4 gap-4 md:gap-0 ${isDragging ? 'select-none cursor-col-resize' : ''}`}
      onKeyDown={handleKeyDown}
    >

      {/* ── Left Pane: Code Editor ───────────────────────────── */}
      <div 
        className="flex flex-col bg-[#141414] border border-[#222] rounded-xl overflow-hidden shadow-sm"
        style={{ 
          width: isDesktop ? `${splitRatio}%` : '100%',
          minHeight: isDesktop ? 'calc(100vh - 120px)' : '420px',
        }}
      >

        {/* Editor Top Bar with Quick Presets */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#222] bg-[#161616] flex-shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#ccc] tracking-wide font-sans">{taskLabel}</span>
          </div>

          {/* Quick Width Presets (Desktop) */}
          {isDesktop && (
            <div className="flex items-center gap-1.5 text-[10px] text-[#555] font-mono">
              <span className="text-[#444]">Width:</span>
              <button
                onClick={() => setSplitRatio(68)}
                title="Expand Code Editor to 70%"
                className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                  splitRatio > 60
                    ? 'border-blue-500/50 bg-blue-500/15 text-blue-400 font-medium'
                    : 'border-[#262626] bg-[#1a1a1a] text-[#777] hover:text-[#bbb]'
                }`}
              >
                Code 70%
              </button>
              <button
                onClick={() => setSplitRatio(50)}
                title="Equal 50/50 split"
                className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                  splitRatio >= 45 && splitRatio <= 55
                    ? 'border-blue-500/50 bg-blue-500/15 text-blue-400 font-medium'
                    : 'border-[#262626] bg-[#1a1a1a] text-[#777] hover:text-[#bbb]'
                }`}
              >
                50 / 50
              </button>
              <button
                onClick={() => setSplitRatio(32)}
                title="Expand Response Panel to 70%"
                className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                  splitRatio < 40
                    ? 'border-blue-500/50 bg-blue-500/15 text-blue-400 font-medium'
                    : 'border-[#262626] bg-[#1a1a1a] text-[#777] hover:text-[#bbb]'
                }`}
              >
                Output 70%
              </button>
            </div>
          )}

          <span className="hidden sm:inline text-[11px] text-[#444]">
            <kbd className="bg-[#1a1a1a] border border-[#2a2a2a] px-1.5 py-0.5 rounded text-[10px] text-[#666]">Ctrl+Enter</kbd> run
          </span>
        </div>

        {/* Monaco Editor Area */}
        <div className="flex-1 min-h-[300px] p-3 bg-[#111111]">
          <CodeEditor
            code={code}
            setCode={setCode}
            language={language}
            setLanguage={setLanguage}
          />
        </div>

        {/* Run Button Action Bar */}
        <div className="p-3 border-t border-[#222] bg-[#161616] flex-shrink-0">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className={`
              w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2
              transition-all duration-200 cursor-pointer
              ${loading
                ? 'bg-[#1e1e1e] text-[#555] cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 active:scale-[0.99]'}
            `}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#555] border-t-transparent rounded-full animate-spin" />
                <span>Running {taskLabel}...</span>
              </>
            ) : (
              <span>Run {taskLabel}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Draggable Split-Pane Divider (Desktop Only) ────────── */}
      {isDesktop && (
        <div
          onMouseDown={handleMouseDown}
          className={`
            flex items-center justify-center w-3 mx-1 bg-[#111111] hover:bg-blue-600/20
            cursor-col-resize transition-all rounded select-none group
            ${isDragging ? 'bg-blue-600/30' : ''}
          `}
          title="Drag left or right to resize editor and response"
        >
          <div className={`w-0.5 h-10 rounded-full transition-colors ${isDragging ? 'bg-blue-400' : 'bg-[#333] group-hover:bg-blue-400'}`} />
        </div>
      )}

      {/* ── Right Pane: Pipeline Viz & Scrollable Response ───── */}
      <div 
        ref={responseRef}
        className="flex flex-col min-w-0"
        style={{ 
          width: isDesktop ? `${100 - splitRatio}%` : '100%',
          minHeight: isDesktop ? 'calc(100vh - 120px)' : '460px',
        }}
      >

        {/* LangGraph Pipeline Status Bar */}
        <div className="flex-shrink-0">
          <LangGraphViz isRunning={loading} />
        </div>

        {/* coedass Response Window */}
        <div className="flex-1 min-h-[380px] flex flex-col">
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