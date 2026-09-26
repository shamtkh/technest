import { useCallback, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ToastContext } from '../hooks/useToast'

const ICONS = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/>
      <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/>
      <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  warning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 3L2 21h20L12 3z" fill="currentColor" opacity="0.2"/>
      <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/>
      <path d="M12 8h.01M12 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
}

const TYPE_STYLES = {
  success: {
    icon: '#22c55e',
    border: 'rgba(22,163,74,0.25)',
  },
  error: {
    icon: '#ef4444',
    border: 'rgba(239,68,68,0.25)',
  },
  warning: {
    icon: '#f59e0b',
    border: 'rgba(245,158,11,0.25)',
  },
  info: {
    icon: '#3d7fff',
    border: 'rgba(61,127,255,0.25)',
  },
}

let idCounter = 0
const MAX_TOASTS = 3
const EXIT_MS = 300

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})
  // group key -> id of the toast currently showing it
  const activeByKey = useRef(new Map())
  // ids of visible (not exiting) toasts, oldest first
  const visibleOrder = useRef([])

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    for (const [key, value] of activeByKey.current) {
      if (value === id) activeByKey.current.delete(key)
    }
    visibleOrder.current = visibleOrder.current.filter((visibleId) => visibleId !== id)
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, EXIT_MS)
  }, [])

  // Toasts about the same thing — an explicit `key` (e.g. wishlist toggles)
  // or simply the same text — update the visible toast and restart its timer
  // instead of stacking copies. At most MAX_TOASTS are shown at once.
  const showToast = useCallback(
    (message, type = 'info', duration = 2500, key = null) => {
      const groupKey = key ?? `${type}:${message}`
      const existingId = activeByKey.current.get(groupKey)
      if (existingId !== undefined) {
        clearTimeout(timers.current[existingId])
        timers.current[existingId] = setTimeout(() => dismiss(existingId), duration)
        setToasts((prev) => prev.map((t) => (t.id === existingId ? { ...t, message, type, bump: t.bump + 1 } : t)))
        return existingId
      }

      const id = ++idCounter
      activeByKey.current.set(groupKey, id)
      visibleOrder.current.push(id)
      timers.current[id] = setTimeout(() => dismiss(id), duration)
      setToasts((prev) => [...prev, { id, message, type, exiting: false, bump: 0 }])
      while (visibleOrder.current.length > MAX_TOASTS) dismiss(visibleOrder.current[0])
      return id
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      {createPortal(
        <div className="toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }) {
  const s = TYPE_STYLES[toast.type] || TYPE_STYLES.info

  return (
    <div className={toast.exiting ? 'toast-exit' : 'toast-enter'}>
      {/* Re-keyed on every repeat so the bump animation replays. */}
      <div
        key={toast.bump}
        role="status"
        className={`toast ${toast.bump ? 'toast-bump' : ''}`}
        style={{ borderColor: s.border }}
      >
        <span className="toast-icon" style={{ color: s.icon }}>{ICONS[toast.type]}</span>
        <span className="toast-message">{toast.message}</span>
        <button type="button" className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="Close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
