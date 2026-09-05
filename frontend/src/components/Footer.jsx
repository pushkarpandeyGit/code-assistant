// ─────────────────────────────────────────────────────────────
// Footer.jsx — Professional Application Footer
//
// Displays:
// - Author credit: "Created by Pushkar"
// - Engineering stack attribution
// - Clean status indicators and copyright
// ─────────────────────────────────────────────────────────────

import { API_BASE } from '../config'

function Footer() {
  return (
    <footer className="h-10 bg-[#161616] border-t border-[#222] px-4 flex items-center justify-between text-xs text-[#666] flex-shrink-0 select-none z-10">
      
      {/* ── Left: Author Credit ── */}
      <div className="flex items-center gap-2">
        <span>Created by <span className="text-[#bbb] font-medium hover:text-blue-400 transition-colors">Pushkar</span></span>
        <span className="text-[#333]">•</span>
      </div>

      {/* ── Center: Tech Stack (Hidden on small mobile) ── */}
      <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#444]">
        <span>React</span>
        <span className="text-[#2a2a2a]">•</span>
        <span>Tailwind</span>
        <span className="text-[#2a2a2a]">•</span>
        <span>FastAPI</span>
        <span className="text-[#2a2a2a]">•</span>
        <span>LangGraph</span>
        <span className="text-[#2a2a2a]">•</span>
        <span>Google Gemini</span>
      </div>

      {/* ── Right: Links & Version ── */}
      <div className="flex items-center gap-3 text-[11px]">
        <a 
          href={`${API_BASE}/docs`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[#555] hover:text-blue-400 transition-colors hidden xs:inline"
        >
          API Docs
        </a>
        <span className="text-[#333] hidden xs:inline">•</span>
        <span className="text-[#444] font-mono">v1.0.0</span>
      </div>

    </footer>
  )
}

export default Footer
