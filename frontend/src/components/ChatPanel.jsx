// ─────────────────────────────────────────────────────────────
// ChatPanel.jsx — Resizable & Unified Code Chat Workspace
//
// Features:
// - Code Context and Chat Conversation in the SAME unified window
// - Draggable Split Divider to resize Code vs Chat
// - Quick Presets: Code 60% | 50 / 50 | Chat 70%
// - Mobile: Code Context & Chat stacked smoothly in one view
// - Thread ID preserved across messages for LangGraph conversation memory
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react'
import { API_BASE } from '../config'
import CodeEditor from './CodeEditor'
import ChatBubble from './ChatBubble'

const EXAMPLE_PROMPTS = [
  'What does this code do?',
  'Find bugs & edge cases',
  'How can this be optimized?',
  'Explain line by line',
]

function ChatPanel() {
  const [code,        setCode]       = useState('')
  const [language,    setLanguage]   = useState('python')
  const [question,    setQuestion]   = useState('')
  const [messages,    setMessages]   = useState([])
  const [loading,     setLoading]    = useState(false)
  const [error,       setError]      = useState('')

  // Mobile collapse toggle for code context (both still in same window)
  const [showCodeMobile, setShowCodeMobile] = useState(true)

  // ── Resizable Split-Pane (Desktop) ─────────────────────────
  const [splitRatio, setSplitRatio] = useState(45)
  const [isDragging, setIsDragging] = useState(false)
  const [isDesktop,  setIsDesktop]  = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true)

  const threadIdRef  = useRef(null)
  const scrollRef    = useRef(null)
  const containerRef = useRef(null)

  // Monitor screen width
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-scroll chat when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // ── Dragging logic for Code vs Chat ───────────────────────
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

  // ── Send Message ───────────────────────────────────────────
  const sendMessage = async () => {
    if (!question.trim()) return
    if (!code.trim()) {
      setError('Please add your code in the Code Context editor first.')
      return
    }

    const q = question.trim()
    setQuestion('')
    setError('')
    setLoading(true)

    setMessages(prev => [
      ...prev,
      { role: 'user',      content: q },
      { role: 'assistant', content: '' },
    ])

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          question: q,
          thread_id: threadIdRef.current,
        }),
      })

      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.detail?.message || `Error ${res.status}`)
      }

      const data = await res.json()
      // Preserve thread_id for conversation memory
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
      setLoading(false)
    }
  }

  const startNewChat = () => {
    threadIdRef.current = null
    setMessages([])
    setError('')
  }

  const shortId = threadIdRef.current?.slice(0, 8)

  return (
    <div 
      ref={containerRef}
      className={`w-full flex flex-col md:flex-row p-3 md:p-4 gap-4 md:gap-0 ${isDragging ? 'select-none cursor-col-resize' : ''}`}
    >

      {/* ── Left Pane: Code Context ──────────────────────────── */}
      <div 
        className="flex flex-col bg-[#141414] border border-[#222] rounded-xl overflow-hidden shadow-sm"
        style={{ 
          width: isDesktop ? `${splitRatio}%` : '100%',
          minHeight: isDesktop ? 'calc(100vh - 120px)' : (showCodeMobile ? '340px' : 'auto'),
        }}
      >
        {/* Code Context Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#222] bg-[#161616] flex-shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#ccc] tracking-wide">Code Context</span>
            <span className="text-[10px] text-[#555] hidden sm:inline">(AI references this)</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Width Presets (Desktop) */}
            {isDesktop && (
              <div className="flex items-center gap-1.5 text-[10px] text-[#555] font-mono">
                <span className="text-[#444]">Width:</span>
                <button
                  onClick={() => setSplitRatio(60)}
                  className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                    splitRatio > 50
                      ? 'border-blue-500/50 bg-blue-500/15 text-blue-400 font-medium'
                      : 'border-[#262626] bg-[#1a1a1a] text-[#777] hover:text-[#bbb]'
                  }`}
                >
                  Code 60%
                </button>
                <button
                  onClick={() => setSplitRatio(45)}
                  className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                    splitRatio <= 50 && splitRatio >= 40
                      ? 'border-blue-500/50 bg-blue-500/15 text-blue-400 font-medium'
                      : 'border-[#262626] bg-[#1a1a1a] text-[#777] hover:text-[#bbb]'
                  }`}
                >
                  50 / 50
                </button>
                <button
                  onClick={() => setSplitRatio(30)}
                  className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                    splitRatio < 40
                      ? 'border-blue-500/50 bg-blue-500/15 text-blue-400 font-medium'
                      : 'border-[#262626] bg-[#1a1a1a] text-[#777] hover:text-[#bbb]'
                  }`}
                >
                  Chat 70%
                </button>
              </div>
            )}

            {/* Mobile Toggle to expand/collapse code editor in place */}
            {!isDesktop && (
              <button
                onClick={() => setShowCodeMobile(!showCodeMobile)}
                className="text-xs px-2 py-1 rounded bg-[#1f1f1f] text-[#888] hover:text-[#ccc] border border-[#2a2a2a]"
              >
                {showCodeMobile ? 'Minimize Code' : 'Show Code'}
              </button>
            )}
          </div>
        </div>

        {/* Code Editor Body */}
        {(!isDesktop && !showCodeMobile) ? null : (
          <div className="flex-1 min-h-[250px] p-3 bg-[#111111]">
            <CodeEditor
              code={code}
              setCode={setCode}
              language={language}
              setLanguage={setLanguage}
            />
          </div>
        )}

        {/* Memory Footnote */}
        <div className="px-4 py-2 bg-[#161616] border-t border-[#222] flex-shrink-0">
          <p className="text-[11px] text-[#555]">
            LangGraph Memory Saver active • Continuous conversation thread
          </p>
        </div>
      </div>

      {/* ── Draggable Split Divider (Desktop Only) ────────────── */}
      {isDesktop && (
        <div
          onMouseDown={handleMouseDown}
          className={`
            flex items-center justify-center w-3 mx-1 bg-[#111111] hover:bg-blue-600/20
            cursor-col-resize transition-all rounded select-none group
            ${isDragging ? 'bg-blue-600/30' : ''}
          `}
          title="Drag left or right to resize code vs chat"
        >
          <div className={`w-0.5 h-10 rounded-full transition-colors ${isDragging ? 'bg-blue-400' : 'bg-[#333] group-hover:bg-blue-400'}`} />
        </div>
      )}

      {/* ── Right Pane: Chat Conversation (SAME Window) ──────── */}
      <div 
        className="flex flex-col bg-[#141414] border border-[#222] rounded-xl overflow-hidden shadow-sm min-w-0"
        style={{ 
          width: isDesktop ? `${100 - splitRatio}%` : '100%',
          minHeight: isDesktop ? 'calc(100vh - 120px)' : '500px',
        }}
      >
        {/* Chat Toolbar Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#222] bg-[#161616] flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#ccc]">Chat Session</span>
            {shortId ? (
              <span className="text-[10px] text-[#666] font-mono px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#252525]">
                thread: <span className="text-blue-400">{shortId}</span>
              </span>
            ) : (
              <span className="text-[10px] text-[#444]">Ready</span>
            )}
          </div>

          <button
            onClick={startNewChat}
            disabled={messages.length === 0}
            className="text-xs px-2.5 py-1 rounded-lg border border-[#262626] bg-[#1a1a1a] text-[#777] hover:text-[#bbb] hover:border-[#383838] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            New Session
          </button>
        </div>

        {/* Message Thread Scrollable Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 min-h-[300px] bg-[#111111]">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center py-12 px-4 select-none">
              <span className="text-3xl opacity-15 font-mono text-blue-400">&lt;c&gt;</span>
              <div>
                <p className="text-sm font-medium text-[#777]">Ask anything about your code context</p>
                <p className="text-xs text-[#444] mt-1">Multi-turn memory retains context across questions</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {EXAMPLE_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => setQuestion(p)}
                    className="text-xs px-3 py-1.5 rounded-full bg-[#161616] text-[#666] border border-[#252525] hover:border-blue-500/40 hover:text-blue-400 transition-all cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatBubble
              key={i}
              role={msg.role}
              content={msg.content}
              isStreaming={loading && i === messages.length - 1 && msg.role === 'assistant'}
            />
          ))}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-4 mb-2 p-2.5 rounded-lg bg-red-950/30 border border-red-900/40 flex items-center justify-between flex-shrink-0 text-xs text-red-400">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-[#666] hover:text-red-300 ml-2">✕</button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 border-t border-[#222] bg-[#161616] flex-shrink-0">
          <div className="flex gap-2 bg-[#1a1a1a] rounded-xl border border-[#282828] p-2 focus-within:border-blue-500/50 transition-colors">
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Ask a question about the code above... (Enter to send, Shift+Enter for newline)"
              disabled={loading}
              rows={2}
              className="flex-1 bg-transparent text-sm text-[#ddd] placeholder-[#444] resize-none focus:outline-none disabled:opacity-40 leading-relaxed"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !question.trim()}
              className={`
                self-end px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer
                ${loading || !question.trim()
                  ? 'bg-[#222] text-[#444] cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/30 active:scale-95'}
              `}
            >
              {loading ? 'Thinking...' : 'Send'}
            </button>
          </div>
        </div>

      </div>

    </div>
  )
}

export default ChatPanel
