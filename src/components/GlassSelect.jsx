import { useEffect, useRef, useState } from 'react'
import { FaCheck, FaChevronDown } from 'react-icons/fa6'

export default function GlassSelect({ value, onChange, options, className = '', disabled = false }) {
  const [open, setOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const rootRef = useRef(null)
  const closeTimerRef = useRef(null)
  const openRef = useRef(false)
  const selected = options.find((option) => option.value === value) || options[0]

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) closeMenu()
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

  function closeMenu() {
    if (!openRef.current) return
    openRef.current = false
    setIsClosing(true)
    setOpen(false)
    closeTimerRef.current = window.setTimeout(() => setIsClosing(false), 180)
  }

  function choose(option) {
    onChange(option.value)
    closeMenu()
  }

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
      {(open || isClosing) && (
        <div className="glass-select-menu" role="listbox" aria-label={selected?.label}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`glass-select-option ${option.value === value ? 'is-selected' : ''}`}
              onClick={() => choose(option)}
            >
              <span>{option.label}</span>
              {option.value === value && <FaCheck aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}