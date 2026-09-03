// ─────────────────────────────────────────────────────────────
// ErrorBoundary.jsx — Catches React crashes
//
// React error boundaries are CLASS components (can't use hooks).
// They catch JS errors thrown during rendering and show a
// fallback UI instead of a blank white screen.
//
// Without this: any rendering crash → blank white page
// With this:    any rendering crash → visible error card
// ─────────────────────────────────────────────────────────────

import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  // Called when a child component throws during render
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Log to console so developer can see the stack trace
    console.error('React render error caught by ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-[#111111] gap-4 p-8">
          <div className="text-4xl">⚠️</div>
          <div className="text-center max-w-md">
            <p className="text-sm font-semibold text-red-400 mb-2">Something crashed while rendering</p>
            <p className="text-xs text-[#666] mb-4">
              Open browser DevTools (F12) → Console to see the full error.
            </p>
            <pre className="text-[10px] text-red-300 bg-[#1a1a1a] border border-red-900/40 rounded-lg p-3 text-left overflow-auto max-h-32">
              {this.state.error?.message || 'Unknown error'}
            </pre>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white transition-colors"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
