import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { FaCheck, FaChevronDown } from 'react-icons/fa6'
import { useScrollLock } from '../hooks/useScrollLock'

// With `sheet`, phones get a bottom sheet instead of the dropdown: it can't
// be clipped or covered by surrounding panels and its rows are thumb-sized.
// Used for the catalog filters; elsewhere the dropdown stays.
const TOUCH_QUERY = '(hover: none) and (pointer: coarse)'
const CLOSE_MS = 220

function subscribeTouch(callback) {
  const query = window.matchMedia(TOUCH_QUERY)
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}
const getTouch = () => window.matchMedia(TOUCH_QUERY).matches
const getTouchOnServer = () => false

export default function GlassSelect({ value, onChange, options, className = '', disabled = false, label = '', sheet = false }) {
  const [open, setOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const rootRef = useRef(null)
  const sheetRef = useRef(null)
  const closeTimerRef = useRef(null)
  const openRef = useRef(false)
  const isTouch = useSyncExternalStore(subscribeTouch, getTouch, getTouchOnServer)
  const useSheet = sheet && isTouch
  const selected = options.find((option) => option.value === value) || options[0]

  useEffect(() => {
    function handlePointerDown(event) {
      // The sheet is portaled to <body>, so it's outside rootRef.
      if (!rootRef.current?.contains(event.target) && !sheetRef.current?.contains(event.target)) closeMenu()
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') closeMenu()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.clearTimeout(closeTimerRef.current)
    }
  }, [])

  // Keep the page from scrolling behind an open sheet.
  useScrollLock(useSheet && open)

  function closeMenu() {
    if (!openRef.current) return
    openRef.current = false
    setIsClosing(true)
    setOpen(false)
    closeTimerRef.current = window.setTimeout(() => setIsClosing(false), CLOSE_MS)
  }

  function choose(option) {
    if (option.disabled) return
    onChange(option.value)
    closeMenu()
  }

  const optionButtons = (optionClass) => options.map((option) => (
    <button
      key={option.value}
      type="button"
      role="option"
      aria-selected={option.value === value}
      disabled={option.disabled}
      className={`${optionClass} ${option.value === value ? 'is-selected' : ''}`}
      onClick={() => choose(option)}
    >
      <span>{option.label}</span>
      {option.value === value && <FaCheck aria-hidden="true" />}
    </button>
  ))

  return (
    <div ref={rootRef} className={`glass-select ${open ? 'is-open' : ''} ${isClosing ? 'is-closing' : ''} ${className}`}>
      <button
        type="button"
        className="glass-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (open) closeMenu()
          else {
            window.clearTimeout(closeTimerRef.current)
            openRef.current = true
            setIsClosing(false)
            setOpen(true)
          }
        }}
      >
        <span className="glass-select-value">{selected?.label}</span>
        <FaChevronDown className="glass-select-chevron" aria-hidden="true" />
      </button>
      {!useSheet && (open || isClosing) && (
        <div className="glass-select-menu" role="listbox" aria-label={label || selected?.label}>
          {optionButtons('glass-select-option')}
        </div>
      )}
      {useSheet && (open || isClosing) && createPortal(
        <div className={`select-sheet-root ${isClosing ? 'is-closing' : ''}`}>
          {/* Stays tappable while closing so a tap can't fall through to the page. */}
          <div className="select-sheet-backdrop" onClick={closeMenu} aria-hidden="true" />
          <div ref={sheetRef} className="select-sheet" role="listbox" aria-label={label || selected?.label}>
            <div className="select-sheet-grabber" aria-hidden="true" />
            {label && <div className="select-sheet-title">{label}</div>}
            <div className="select-sheet-options">{optionButtons('select-sheet-option')}</div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
