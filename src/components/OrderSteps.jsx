import { useTranslation } from 'react-i18next'
import { ORDER_STEPS, ORDER_STEP_LABEL_KEYS, orderStepIndex } from '../utils/orderStatus'

// Segmented progress bar over the four order statuses; the current step shimmers.
export default function OrderSteps({ status, dark = false, className = '' }) {
  const { t } = useTranslation()
  const current = orderStepIndex(status)
  const idle = dark ? 'bg-white/10' : 'bg-line'
  return (
    <div className={className}>
      <div className="grid grid-cols-4 gap-1.5">
        {ORDER_STEPS.map((step, index) => (
          <span
            key={step}
            className={`h-1.5 rounded-full ${index > current ? idle : 'bg-accent'} ${index === current && step !== 'delivered' ? 'order-step-current' : ''}`}
          />
        ))}
      </div>
      <div className={`mt-2 grid grid-cols-4 gap-1.5 spec-strip text-[0.65rem] ${dark ? 'text-white/40' : 'text-steel'}`}>
        {ORDER_STEP_LABEL_KEYS.map((key, index) => (
          <span key={key} className={`truncate ${index === current ? (dark ? 'text-white/80' : 'font-semibold text-ink-soft') : ''}`}>
            {t(`admin.${key}`)}
          </span>
        ))}
      </div>
    </div>
  )
}
