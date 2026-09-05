// ─────────────────────────────────────────────────────────────
// ChatPanel.jsx — Responsive code chat
//
// Desktop: editor left (40%) | chat right (60%)
// Mobile:  chat full width, editor hidden behind a toggle
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { API_BASE } from '../config'
import CodeEditor from './CodeEditor'
import ChatBubble from './ChatBubble'

const EXAMPLE_PROMPTS = [
  'What does this code do?',
  'Find any bugs',
  'How can this be optimized?',
  'Explain line by line',
]

function ChatPanel() {
  const { setSidebarOpen } = useApp()

  const [code,        setCode]       = useState('')
  const [language,    setLanguage]   = useState('python')
  const [question,    setQuestion]   = useState('')
  const [messages,    setMessages]   = useState([])
  const [loading,     setLoading]    = useState(false)
  const [error,       setError]      = useState('')
  // Mobile: toggle between editor view and chat view
  const [showEditor,  setShowEditor] = useState(false)

  const threadIdRef = useRef(null)
  const scrollRef   = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const sendMessage = async () => {
    if (!question.trim()) return
    if (!code.trim()) { setError('Add code context first.'); return }

    const q = question.trim()
    setQuestion(''); setError(''); setLoading(true)
    setMessages(prev => [...prev,
      { role: 'user',      content: q  },
      { role: 'assistant', content: '' },
    ])

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, question: q, thread_id: threadIdRef.current }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.detail?.message || `Error ${res.status}`)
      }
      const data = await res.json()
      threadIdRef.current = data.thread_id
      setMessages(prev => {
        const u = [...prev]
        u[u.length - 1] = { role: 'assistant', content: data.result }
        return u
      })
    } catch (err) {
      setMessages(prev => prev.slice(0, -1))
      setError(err.message === 'Failed to fetch' ? 'Cannot reach backend on port 8000.' : err.message)
    } finally {
      setLoading(false) }
  }

  // ── Resizable Split-Pane State ─────────────────────────────
  const [splitRatio, setSplitRatio] = useState(40)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)

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
      if (percentage >= 20 && percentage <= 75) {
        setSplitRatio(percentage)
      }
    }

    const handleMouseUp = () => setIsDragging(false)

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const startNewChat = () => { threadIdRef.current = null; setMessages([]); setError('') }

  const shortId = threadIdRef.current?.slice(0, 8)

  return (
    <div 
      ref={containerRef}
      className={`h-full flex overflow-hidden ${isDragging ? 'select-none cursor-col-resize' : ''}`}
    >

      {/* ── Editor panel ──────────────────────────────────
          Desktop: resizable via splitRatio
          Mobile:  hidden by default, toggle with button */}
      <div 
        style={{ width: undefined }}
        className={`
          flex-col border-r border-[#222]
          md:flex
          ${showEditor ? 'flex w-full absolute inset-0 z-20 bg-[#111111]' : 'hidden'}
        `}
        ref={(el) => {
          if (el && window.innerWidth >= 768) {
            el.style.width = `${splitRatio}%`
          }
        }}
      >
        {/* Mobile editor header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#222] flex-shrink-0 bg-[#141414]">
          <p className="text-xs font-semibold text-[#ccc]">Code Context</p>
          <button onClick={() => setShowEditor(false)} className="md:hidden text-[#555] hover:text-[#bbb] text-xs">
            Done
          </button>
        </div>
        <div className="flex-1 min-h-0 p-3">
          <CodeEditor code={code} setCode={setCode} language={language} setLanguage={setLanguage} />
        </div>
        <div className="mx-3 mb-3 px-3 py-2 rounded-xl bg-[#161616] border border-[#222] flex-shrink-0">
          <p className="text-[11px] text-[#555]">
            Questions share memory. Click <span className="text-blue-400">New Chat</span> to reset.
          </p>
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
        <div className="flex flex-col gap-1 items-center">
          <span className="w-0.5 h-0.5 rounded-full bg-[#555]" />
          <span className="w-0.5 h-0.5 rounded-full bg-[#555]" />
          <span className="w-0.5 h-0.5 rounded-full bg-[#555]" />
        </div>
      </div>

      {/* ── Chat panel ───────────────────────────────────── */}
      <div 
        style={{ width: undefined }}
        className="flex-1 flex flex-col min-w-0"
        ref={(el) => {
          if (el && window.innerWidth >= 768) {
            el.style.width = `${100 - splitRatio}%`
          }
        }}
      >

        {/* Chat header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#222] flex-shrink-0 gap-2 bg-[#141414]">
          <div className="flex items-center gap-2">
            <div>
              <p className="text-xs font-semibold text-[#ccc]">Conversation</p>
              {shortId
                ? <p className="text-[10px] text-[#555] font-mono">session <span className="text-blue-400">{shortId}</span></p>
                : <p className="text-[10px] text-[#444]">Ready</p>}
            </div>
          </div>

          {/* Quick Layout Presets (Desktop) */}
          <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-[#555] font-mono">
            <span>Layout:</span>
            <button
              onClick={() => setSplitRatio(60)}
              className={`px-1.5 py-0.5 rounded border transition-colors ${
                splitRatio > 50
                  ? 'border-blue-500/50 bg-blue-500/15 text-blue-400'
                  : 'border-[#262626] bg-[#1a1a1a] text-[#777] hover:text-[#bbb]'
              }`}
            >
              Code 60%
            </button>
            <button
              onClick={() => setSplitRatio(40)}
              className={`px-1.5 py-0.5 rounded border transition-colors ${
                splitRatio <= 50 && splitRatio >= 35
                  ? 'border-blue-500/50 bg-blue-500/15 text-blue-400'
                  : 'border-[#262626] bg-[#1a1a1a] text-[#777] hover:text-[#bbb]'
              }`}
            >
              Balanced
            </button>
            <button
              onClick={() => setSplitRatio(25)}
              className={`px-1.5 py-0.5 rounded border transition-colors ${
                splitRatio < 35
                  ? 'border-blue-500/50 bg-blue-500/15 text-blue-400'
                  : 'border-[#262626] bg-[#1a1a1a] text-[#777] hover:text-[#bbb]'
              }`}
            >
              Chat 75%
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile: toggle editor */}
            <button
              onClick={() => setShowEditor(true)}
              className="md:hidden text-xs px-3 py-1.5 rounded-lg border border-[#252525] text-[#555] hover:text-blue-400 hover:border-blue-500/40 transition-all"
            >
              + Code
            </button>
            <button
              onClick={startNewChat}
              disabled={messages.length === 0}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#252525] text-[#555] hover:text-[#bbb] hover:border-[#383838] transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              New Chat
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-4">
              <p className="text-sm text-[#555]">Ask anything about your code</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {EXAMPLE_PROMPTS.map(p => (
                  <button key={p} onClick={() => setQuestion(p)}
                    className="text-xs px-3 py-1.5 rounded-full bg-[#1a1a1a] text-[#555] border border-[#252525] hover:border-blue-500/40 hover:text-blue-400 transition-all">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatBubble key={i} role={msg.role} content={msg.content}
              isStreaming={loading && i === messages.length - 1 && msg.role === 'assistant'} />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-red-900/15 border border-red-900/30 flex items-center justify-between flex-shrink-0">
            <p className="text-xs text-red-400">{error}</p>
            <button onClick={() => setError('')} className="text-[#555] hover:text-red-400 text-xs ml-3">x</button>
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 flex-shrink-0">
          <div className="flex gap-2 bg-[#1a1a1a] rounded-xl border border-[#252525] p-2 focus-within:border-blue-500/40 transition-colors">
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Ask about your code... (Enter to send)"
              disabled={loading} rows={2}
              className="flex-1 bg-transparent text-sm text-[#ddd] placeholder-[#333] resize-none focus:outline-none disabled:opacity-40 leading-relaxed"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !question.trim()}
              className={`self-end px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                ${loading || !question.trim() ? 'bg-[#1e1e1e] text-[#333] cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
            >
              {loading ? <div className="w-4 h-4 border-2 border-[#444] border-t-transparent rounded-full animate-spin" /> : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatPanel
