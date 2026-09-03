import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FaTriangleExclamation } from 'react-icons/fa6'

export default function ConfirmDialog({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel, danger = true }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.classList.add('confirm-dialog-open')
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.classList.remove('confirm-dialog-open')
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return createPortal((
    <div className="confirm-dialog-overlay fixed inset-0 z-[120] flex items-center justify-center bg-ink/55 p-4" onClick={onCancel}>
      <div className="confirm-dialog-panel w-full max-w-md rounded-[1.75rem] p-6 text-center sm:p-8" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <div className={`confirm-dialog-icon mx-auto mb-4 ${danger ? 'is-danger' : ''}`}>
          <FaTriangleExclamation size={21} aria-hidden="true" />
        </div>
        <h2 id="confirm-dialog-title" className="font-display text-xl font-bold text-ink-soft sm:text-2xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-steel sm:text-base">{message}</p>
        <div className="mt-7 flex flex-col-reverse justify-center gap-3 sm:flex-row">
          <button type="button" onClick={onCancel} className="confirm-dialog-cancel rounded-full px-5 py-2.5 text-sm font-semibold">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className={`confirm-dialog-confirm rounded-full px-5 py-2.5 text-sm font-semibold text-white ${danger ? 'is-danger' : ''}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  ), document.body)
}