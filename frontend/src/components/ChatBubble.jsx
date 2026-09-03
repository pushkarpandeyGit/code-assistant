// ─────────────────────────────────────────────────────────────
// ChatBubble.jsx — Single message bubble
//
// role = 'user'      → right-aligned, "You" label, blue tint
// role = 'assistant' → left-aligned, "<c> coedass" label, dark bg
//
// No emojis. No "AI" text. Blue theme.
// ─────────────────────────────────────────────────────────────

import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

function ChatBubble({ role, content, isStreaming }) {
  const isUser = role === 'user'

  // ── User bubble (right side) ───────────────────────────────
  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%]">
          <p className="text-[10px] text-[#555] text-right mb-1 font-mono">You</p>
          <div className="bg-blue-600/15 border border-blue-600/25 rounded-2xl rounded-br-sm px-4 py-2.5">
            <p className="text-sm text-[#ddd] leading-relaxed whitespace-pre-wrap">{content}</p>
          </div>
        </div>
      </div>
    )
  }

  // ── coedass bubble (left side) ─────────────────────────────
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[90%]">
        {/* Brand label */}
        <p className="text-[10px] text-blue-400 mb-1 font-mono">&lt;c&gt; coedass</p>

        <div className="bg-[#1a1a1a] border border-[#252525] rounded-2xl rounded-tl-sm px-4 py-3">

          {/* Typing animation — shown when streaming with no content yet */}
          {isStreaming && !content && (
            <div className="flex items-center gap-1 h-5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}

          {/* Markdown response */}
          {content && (
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
                          showLineNumbers={false}
                          customStyle={{ borderRadius: '0.5rem', fontSize: '0.75rem', margin: '0.5rem 0' }}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      )
                    }
                    return <code>{children}</code>
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}

          {/* Streaming cursor */}
          {isStreaming && content && (
            <span className="inline-block w-0.5 h-3.5 bg-blue-400 animate-pulse ml-0.5 align-middle" />
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatBubble
