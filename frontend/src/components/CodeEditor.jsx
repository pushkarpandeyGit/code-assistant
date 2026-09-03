// ─────────────────────────────────────────────────────────────
// CodeEditor.jsx — Monaco Code Editor Wrapper
//
// This wraps the Monaco Editor (same engine as VS Code) so we
// don't have to repeat its setup code everywhere it's used.
// Both AnalyzePanel and ChatPanel use this component.
//
// What it does:
// - Renders a VS Code-like editor with syntax highlighting
// - Shows a language dropdown to switch between languages
// - Shows a file upload button (reads a local file into the editor)
// - Shows line count so user knows how much code they've pasted
//
// React concepts used:
// - props      : receives code, setCode, language, setLanguage from parent
// - useRef     : references the hidden file input element without re-rendering
// - Controlled component : the editor value is controlled by React state (code)
//   meaning React owns the value — the editor just displays it.
// ─────────────────────────────────────────────────────────────

import { useRef } from 'react'
import Editor from '@monaco-editor/react'

// ── Supported languages ────────────────────────────────────────
// Each entry has:
// - value    : what we send to the backend ("python", "javascript", etc.)
// - label    : what the user sees in the dropdown
// - monaco   : the Monaco language ID (for syntax highlighting)
const LANGUAGES = [
  { value: 'python',     label: '🐍 Python',     monaco: 'python'     },
  { value: 'javascript', label: '🟨 JavaScript',  monaco: 'javascript' },
  { value: 'typescript', label: '🔷 TypeScript',  monaco: 'typescript' },
  { value: 'java',       label: '☕ Java',         monaco: 'java'       },
  { value: 'c++',        label: '⚙️ C++',          monaco: 'cpp'        },
  { value: 'c',          label: '🔧 C',            monaco: 'c'          },
  { value: 'go',         label: '🐹 Go',           monaco: 'go'         },
  { value: 'rust',       label: '🦀 Rust',         monaco: 'rust'       },
  { value: 'csharp',     label: '💜 C#',           monaco: 'csharp'     },
  { value: 'ruby',       label: '💎 Ruby',         monaco: 'ruby'       },
  { value: 'php',        label: '🐘 PHP',          monaco: 'php'        },
  { value: 'kotlin',     label: '🎯 Kotlin',       monaco: 'kotlin'     },
  { value: 'swift',      label: '🍎 Swift',        monaco: 'swift'      },
  { value: 'sql',        label: '🗄️ SQL',           monaco: 'sql'        },
]

// ── Helper: auto-detect language from code ─────────────────────
// When user uploads a file or pastes code, we try to guess the
// language from obvious keywords. This is just simple heuristics —
// not perfect but saves the user a click most of the time.
function detectLanguage(code) {
  if (/^\s*def |^\s*import |^\s*from |print\(|if __name__/m.test(code)) return 'python'
  if (/console\.log|const |let |var |=>|require\(|module\.exports/m.test(code)) return 'javascript'
  if (/public static void main|System\.out\.println|import java\./m.test(code)) return 'java'
  if (/#include|cout<<|cin>>|std::/m.test(code)) return 'c++'
  if (/func \w+\(|fmt\.Println|package main/m.test(code)) return 'go'
  if (/fn \w+|println!|let mut|use std::/m.test(code)) return 'rust'
  if (/using System|Console\.WriteLine|namespace /m.test(code)) return 'csharp'
  return null // couldn't detect — keep existing selection
}

function CodeEditor({ code, setCode, language, setLanguage, height = '100%' }) {

  // ── useRef for file input ──────────────────────────────────
  // useRef gives us a direct reference to a DOM element.
  // We use this to programmatically click the hidden file input
  // when the user clicks our styled "Upload File" button.
  // Unlike useState, changing a ref does NOT cause a re-render.
  const fileInputRef = useRef(null)

  // ── Find the Monaco language ID ────────────────────────────
  // Monaco uses slightly different IDs than our value strings
  // e.g. we use "c++" but Monaco expects "cpp"
  const monacoLang = LANGUAGES.find(l => l.value === language)?.monaco || language

  // ── Handle file upload ─────────────────────────────────────
  // When user picks a file, we use the browser's FileReader API
  // to read its text content, then put it in the editor.
  // We also try to auto-detect the language from the file extension.
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Detect language from file extension
    const ext = file.name.split('.').pop().toLowerCase()
    const extMap = {
      py: 'python', js: 'javascript', ts: 'typescript',
      java: 'java', cpp: 'c++', cc: 'c++', c: 'c',
      go: 'go', rs: 'rust', cs: 'csharp', rb: 'ruby',
      php: 'php', kt: 'kotlin', swift: 'swift', sql: 'sql',
    }
    if (extMap[ext]) setLanguage(extMap[ext])

    // FileReader is a browser API that reads files asynchronously.
    // onload fires when reading is complete.
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      setCode(text)
      // Also try content-based detection as a fallback
      if (!extMap[ext]) {
        const detected = detectLanguage(text)
        if (detected) setLanguage(detected)
      }
    }
    reader.readAsText(file)

    // Reset input so the same file can be uploaded again if needed
    e.target.value = ''
  }

  // ── Handle code change in editor ──────────────────────────
  // When the user types in Monaco, it calls this function.
  // We also try to auto-detect language on every change.
  const handleCodeChange = (value) => {
    setCode(value || '')
    // Only auto-detect if there's enough code to make a good guess
    if (value && value.length > 30) {
      const detected = detectLanguage(value)
      if (detected && detected !== language) {
        setLanguage(detected)
      }
    }
  }

  // ── Line count ─────────────────────────────────────────────
  const lineCount = code ? code.split('\n').length : 0
  const charCount = code ? code.length : 0

  return (
    // h-full → takes full height of its parent container
    // flex-col → stacks children vertically
    <div className="h-full flex flex-col bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">

      {/* ── Toolbar: Language selector + File upload + Stats ─ */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">

        {/* Language dropdown
            A "controlled" select: its value is always React state (language),
            and onChange updates that state. React owns the value. */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="text-xs bg-gray-700 text-gray-200 rounded px-2 py-1 border border-gray-600 cursor-pointer focus:outline-none focus:border-blue-500"
        >
          {LANGUAGES.map(lang => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>

        {/* Right side: stats + upload button */}
        <div className="flex items-center gap-3">

          {/* Line/char count — purely informational */}
          {code && (
            <span className="text-xs text-gray-500">
              {lineCount} lines · {charCount} chars
            </span>
          )}

          {/* Hidden real file input — we trigger it via ref */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".py,.js,.ts,.java,.cpp,.cc,.c,.go,.rs,.cs,.rb,.php,.kt,.swift,.sql,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Styled upload button that triggers the hidden input */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload a code file"
            className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors duration-200 flex items-center gap-1"
          >
            📁 Upload File
          </button>
        </div>
      </div>

      {/* ── Monaco Editor ─────────────────────────────────── */}
      {/* Editor takes the remaining height (flex-1 = grow to fill space) */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={monacoLang}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"           // VS Code dark theme (built-in)
          options={{
            fontSize: 13,
            fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
            minimap: { enabled: false },   // hide the tiny overview on the right
            scrollBeyondLastLine: false,   // don't add padding after last line
            wordWrap: 'on',                // wrap long lines
            lineNumbers: 'on',
            folding: true,                 // allow code folding
            automaticLayout: true,         // resize editor when container resizes
            padding: { top: 12 },
            renderLineHighlight: 'line',   // highlight current line
            suggestOnTriggerCharacters: true,
          }}
          loading={
            // Loading state while Monaco initializes
            <div className="h-full flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-500">Loading editor...</p>
              </div>
            </div>
          }
        />
      </div>
    </div>
  )
}

export default CodeEditor
