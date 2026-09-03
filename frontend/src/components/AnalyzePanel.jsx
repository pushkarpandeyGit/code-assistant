// ─────────────────────────────────────────────────────────────
// AnalyzePanel.jsx — One-shot code analysis
//
// Reads activeTask from context via useApp(). No props.
// Streams response token by token from /stream (SSE).
// Blue theme, no emojis.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useApp } from '../context/AppContext'
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

const API_BASE = 'http://localhost:8000'

function AnalyzePanel() {
  // Read activeTask from context — no prop drilling
  const { activeTask } = useApp()

  const [code,     setCode]    = useState('')
  const [language, setLanguage] = useState('python')
  const [result,   setResult]  = useState('')
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState('')

  const taskLabel = TASK_META[activeTask] || 'Analyze'

  const runAnalysis = async () => {
    if (!code.trim()) { setError('Add some code first.'); return }

    setLoading(true)
    setResult('')
    setError('')

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
        const { value, done: streamDone } = await reader.read()
        if (streamDone) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue
          try {
            const { t: token } = JSON.parse(jsonStr)
            if (token === '[DONE]')         { done = true; break }
            if (token?.startsWith('[ERROR]')) throw new Error(token.replace('[ERROR] ', ''))
            setResult(prev => prev + token)
          } catch (pe) {
            if (pe.message?.startsWith('[ERROR]') || pe.message?.includes('Error')) throw pe
          }
        }
      }
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot reach backend. Is uvicorn running on port 8000?'
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
    <div className="h-full flex overflow-hidden" onKeyDown={handleKeyDown}>

      {/* ── Left: editor ───────────────────────────────────── */}
      <div className="w-[45%] h-full flex flex-col border-r border-[#222]">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#222] flex-shrink-0">
          <span className="text-sm font-semibold text-[#ccc]">{taskLabel}</span>
          <span className="text-[11px] text-[#333]">
            <kbd className="bg-[#1e1e1e] border border-[#2a2a2a] px-1.5 py-0.5 rounded text-[10px] text-[#555]">Ctrl+Enter</kbd> run
          </span>
        </div>

        {/* Editor */}
        <div className="flex-1 min-h-0 p-3">
          <CodeEditor
            code={code}
            setCode={setCode}
            language={language}
            setLanguage={setLanguage}
          />
        </div>

        {/* Run button */}
        <div className="px-3 pb-3 flex-shrink-0">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className={`
              w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2
              transition-all duration-200
              ${loading
                ? 'bg-[#1a1a1a] text-[#444] cursor-not-allowed'
                : 'bg-blue-800 hover:bg-blue-600 text-white shadow-lg shadow-blue-600/20'}
            `}
          >
            {loading
              ? <><div className="w-4 h-4 border-2 border-[#444] border-t-transparent rounded-full animate-spin" /> Running...</>
              : `Run ${taskLabel}`
            }
          </button>
        </div>
      </div>

      {/* ── Right: viz + response ───────────────────────────── */}
      <div className="flex-1 h-full flex flex-col min-w-0">
        <div className="px-4 pt-3 flex-shrink-0">
          <LangGraphViz isRunning={loading} />
        </div>
        <div className="flex-1 px-4 py-3 min-h-0">
          <ResponsePanel result={result} loading={loading} error={error} task={activeTask} />
        </div>
      </div>
    </div>
  )
}

export default AnalyzePanel
