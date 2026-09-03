// ─────────────────────────────────────────────────────────────
// ChatPanel.jsx — Code Chat with LangGraph memory
//
// Reads nothing from context (all local state for chat).
// Labels: "You" / "<c> coedass" — no emojis, no "AI".
// Blue theme. thread_id in useRef for memory across messages.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react'
import CodeEditor from './CodeEditor'
import ChatBubble from './ChatBubble'

const API_BASE = 'http://localhost:8000'

const EXAMPLE_PROMPTS = [
  'What does this code do?',
  'Find any bugs',
  'How can this be optimized?',
  'Explain it line by line',
]

function ChatPanel() {
  const [code,     setCode]    = useState('')
  const [language, setLanguage] = useState('python')
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState('')

  // thread_id in useRef — persists across renders without re-renders
  // This is what gives the chat its "memory" — same thread = same conversation
  const threadIdRef = useRef(null)
  const scrollRef   = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async () => {
    if (!question.trim()) return
    if (!code.trim()) { setError('Add code context on the left first.'); return }

    const q = question.trim()
    setQuestion('')
    setError('')
    setLoading(true)

    // Optimistic UI — show user message + empty assistant placeholder immediately
    setMessages(prev => [
      ...prev,
      { role: 'user',      content: q  },
      { role: 'assistant', content: '' },
    ])

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code, language, question: q,
          thread_id: threadIdRef.current,
        }),
      })

      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.detail?.message || `Error ${res.status}`)
      }

      const data = await res.json()
      threadIdRef.current = data.thread_id // save for next message

      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: data.result }
        return updated
      })
    } catch (err) {
      setMessages(prev => prev.slice(0, -1)) // remove empty placeholder
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot reach backend on port 8000.'
          : err.message || 'Unexpected error'
      )
    } finally {
      setLoading(false)
    }
  }

  const startNewChat = () => {
    threadIdRef.current = null
    setMessages([])
    setError('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const shortId = threadIdRef.current?.slice(0, 8)

  return (
    <div className="h-full flex overflow-hidden">

      {/* ── Left: code context editor ──────────────────────── */}
      <div className="w-[40%] h-full flex flex-col border-r border-[#222]">
        <div className="px-4 py-3 border-b border-[#222] flex-shrink-0">
          <p className="text-sm font-semibold text-[#ccc]">Code Context</p>
          <p className="text-xs text-[#444] mt-0.5">The assistant answers questions about this code</p>
        </div>
        <div className="flex-1 min-h-0 p-3">
          <CodeEditor code={code} setCode={setCode} language={language} setLanguage={setLanguage} />
        </div>
        <div className="mx-3 mb-3 flex-shrink-0 px-3 py-2.5 rounded-xl bg-[#161616] border border-[#222]">
          <p className="text-[11px] text-[#555] leading-relaxed">
            Questions in the same session share memory. Click{' '}
            <span className="text-blue-400">New Chat</span> to reset.
          </p>
        </div>
      </div>

      {/* ── Right: chat ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#222] flex-shrink-0">
          <div>
            <p className="text-sm font-semibold text-[#ccc]">Code Chat</p>
            {shortId
              ? <p className="text-[11px] text-[#444] mt-0.5 font-mono">
                  thread <span className="text-blue-400">{shortId}...</span>
                </p>
              : <p className="text-[11px] text-[#333] mt-0.5">No active thread</p>
            }
          </div>
          <button
            onClick={startNewChat}
            disabled={messages.length === 0}
            className="text-xs px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-[#555] hover:text-[#bbb] hover:border-[#444] transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed"
          >
            New Chat
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-[#555]">Ask anything about your code</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {EXAMPLE_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => setQuestion(p)}
                    className="text-xs px-3 py-1.5 rounded-full bg-[#1a1a1a] text-[#555] border border-[#252525] hover:border-blue-500/40 hover:text-blue-400 transition-all duration-150"
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

        {/* Error */}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-red-900/15 border border-red-900/30 flex items-center justify-between flex-shrink-0">
            <p className="text-xs text-red-400">{error}</p>
            <button onClick={() => setError('')} className="text-[#555] hover:text-red-400 text-xs ml-3">x</button>
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 flex-shrink-0">
          <div className="flex gap-2 bg-[#1a1a1a] rounded-xl border border-[#252525] p-2 focus-within:border-blue-500/40 transition-colors duration-200">
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your code... (Enter to send)"
              disabled={loading}
              rows={2}
              className="flex-1 bg-transparent text-sm text-[#ddd] placeholder-[#333] resize-none focus:outline-none disabled:opacity-40 leading-relaxed"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !question.trim()}
              className={`
                self-end px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                ${loading || !question.trim()
                  ? 'bg-[#1e1e1e] text-[#333] cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'}
              `}
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-[#444] border-t-transparent rounded-full animate-spin" />
                : 'Send'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatPanel
