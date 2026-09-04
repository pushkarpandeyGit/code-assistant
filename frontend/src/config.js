// ─────────────────────────────────────────────────────────────
// config.js — Centralized app configuration
//
// VITE_API_URL is read from environment at build time.
// In development: create frontend/.env with VITE_API_URL=http://localhost:8000
// In production:  set VITE_API_URL=https://your-backend.railway.app in Vercel
// ─────────────────────────────────────────────────────────────

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Math preprocessor ──────────────────────────────────────────
// The AI outputs LaTeX math like $O(n^2)$ and $$\frac{n}{2}$$
// react-markdown doesn't render LaTeX by default.
// This converts them to inline code spans so they display cleanly
// without needing the remark-math / katex npm packages.
//
// $O(n^2)$  → `O(n^2)`   (inline code — green monospace)
// $$...$$   → ```\n...\n``` (fenced block)
export function processMarkdown(text) {
  if (!text) return text
  return text
    // Display math ($$...$$) → fenced code block
    .replace(/\$\$([^$]+)\$\$/gs, (_match, inner) => `\`\`\`\n${inner.trim()}\n\`\`\``)
    // Inline math ($...$) → inline code, but avoid $$ being caught twice
    .replace(/\$([^$\n`][^$\n]*?)\$/g, (_match, inner) => `\`${inner.trim()}\``)
}
