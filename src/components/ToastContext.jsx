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
    bar: '#22c55e',
    icon: '#22c55e',
    bg: 'rgba(22,163,74,0.08)',
    border: 'rgba(22,163,74,0.25)',
  },
  error: {
    bar: '#ef4444',
    icon: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
  },
  warning: {
    bar: '#f59e0b',
    icon: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
  },
  info: {
    bar: '#3d7fff',
    icon: '#3d7fff',
    bg: 'rgba(61,127,255,0.08)',
    border: 'rgba(61,127,255,0.25)',
  },
}

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    )
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 380)
    if (timers.current[id]) clearTimeout(timers.current[id])
  }, [])

  const showToast = useCallback(
    (message, type = 'info', duration = 3500) => {
      const id = ++idCounter
      setToasts((prev) => [...prev, { id, message, type, exiting: false }])
      timers.current[id] = setTimeout(() => dismiss(id), duration)
      return id
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      {createPortal(
        <div
          style={{
            position: 'fixed',
            top: '1.25rem',
            right: '1.25rem',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            maxWidth: '360px',
            width: 'calc(100vw - 2.5rem)',
            pointerEvents: 'none',
          }}
        >
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
    <div
      className={toast.exiting ? 'toast-exit' : 'toast-enter'}
      style={{
        pointerEvents: 'all',
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.85rem 1rem',
        borderRadius: '1rem',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${s.border}`,
        boxShadow: '0 8px 32px -4px rgba(15,18,26,0.18), 0 2px 8px -2px rgba(15,18,26,0.12)',
        overflow: 'hidden',
      }}
    >
      {/* left color bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          borderRadius: '1rem 0 0 1rem',
          background: s.bar,
        }}
      />

      {/* icon */}
      <span style={{ color: s.icon, flexShrink: 0, marginTop: '1px' }}>
        {ICONS[toast.type]}
      </span>

      {/* message */}
      <span
        style={{
          flex: 1,
          fontSize: '0.875rem',
          fontWeight: 500,
          color: '#12161f',
          lineHeight: 1.4,
        }}
      >
        {toast.message}
      </span>

      {/* close btn */}
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#8891a3',
          padding: '2px',
          borderRadius: '50%',
          transition: 'color 0.15s',
          lineHeight: 1,
        }}
        aria-label="Close"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}
