// ─────────────────────────────────────────────────────────────
// ResponsePanel.jsx — AI Response Display
//
// Header says "<c> coedass" not "AI Response".
// Blue accent, no emojis.
// Markdown rendered via .md class in index.css.
// react-markdown v10 compatible — className on wrapper div only.
// ─────────────────────────────────────────────────────────────

import { useRef, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { processMarkdown } from '../config'

function ResponsePanel({ result, loading, error, task }) {
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [result])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('Copy failed. Select text manually.')
    }
  }

  const handleExport = () => {
    if (!result) return
    const blob = new Blob([result], { type: 'text/markdown;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `coedass-${task || 'result'}-${Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Loading (no content yet)
  if (loading && !result) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#161616] rounded-xl border border-[#222] gap-4">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-sm text-[#bbb] font-mono">&lt;c&gt; coedass is writing...</p>
          <p className="text-xs text-[#333] mt-1">LangGraph pipeline running</p>
        </div>
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#161616] rounded-xl border border-red-900/30 gap-3 p-6">
        <p className="text-sm font-semibold text-red-400">Error</p>
        <p className="text-xs text-[#777] text-center max-w-xs">{error}</p>
        <p className="text-xs text-[#333]">Make sure FastAPI is running on port 8000</p>
      </div>
    )
  }

  // Empty
  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#161616] rounded-xl border border-[#222] gap-2">
        <p className="text-sm text-[#444]">Response will appear here</p>
        <p className="text-xs text-[#2a2a2a]">Select a task and click Run</p>
      </div>
    )
  }

  // Result
  return (
    <div className="h-full flex flex-col bg-[#161616] rounded-xl border border-[#222] overflow-hidden">

      {/* Header — shows "<c> coedass" not "AI Response" */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#222] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-blue-400">&lt;c&gt; coedass</span>
          {loading && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded-lg bg-[#1e1e1e] text-[#555] hover:text-[#bbb] border border-[#252525] hover:border-[#383838] transition-all duration-150 disabled:opacity-20 cursor-pointer"
          >
            Export
          </button>
          <button
            onClick={handleCopy}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded-lg bg-[#1e1e1e] text-[#555] hover:text-[#bbb] border border-[#252525] hover:border-[#383838] transition-all duration-150 disabled:opacity-20 cursor-pointer"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
        {/* Wrap in div.md — react-markdown v10 doesn't accept className prop directly */}
        <div className="md">
          <ReactMarkdown
            components={{
              code({ className, children }) {
                const match = /language-(\w+)/.exec(className || '')
                if (match) {
                  return (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      showLineNumbers={true}
                      customStyle={{ borderRadius: '0.5rem', fontSize: '0.78rem', margin: '0.75rem 0' }}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  )
                }
                return <code>{children}</code>
              },
              table: ({ children }) => (
                <div className="overflow-x-auto my-3">
                  <table className="w-full border-collapse text-xs">{children}</table>
                </div>
              ),
            }}
          >
            {processMarkdown(result)}
          </ReactMarkdown>
        </div>

        {loading && (
          <span className="inline-block w-0.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-middle" />
        )}
      </div>
    </div>
  )
}

export default ResponsePanel
