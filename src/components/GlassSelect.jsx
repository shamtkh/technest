import { useEffect, useRef, useState } from 'react'
import { FaCheck, FaChevronDown } from 'react-icons/fa6'

export default function GlassSelect({ value, onChange, options, className = '', disabled = false }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const selected = options.find((option) => option.value === value) || options[0]

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function choose(option) {
    onChange(option.value)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`glass-select ${open ? 'is-open' : ''} ${className}`}>
      <button
        type="button"
        className="glass-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label}</span>
        <FaChevronDown className="glass-select-chevron" aria-hidden="true" />
      </button>
      {open && (
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