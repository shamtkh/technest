import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaArrowRight, FaCircleCheck, FaCircleExclamation, FaEye, FaEyeSlash } from 'react-icons/fa6'

export function AuthField({ label, icon: Icon, error, hint, trailing, ...inputProps }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-steel">{label}</label>
      <div className="auth-field-control relative">
        <Icon className="auth-icon pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-steel" size={13} aria-hidden="true" />
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`input auth-input ${trailing ? 'has-trailing' : ''} ${error ? 'is-invalid' : ''}`}
          {...inputProps}
        />
        {trailing}
      </div>
      {error ? (
        <span id={`${id}-error`} className="mt-1.5 block text-xs text-danger">{error}</span>
      ) : hint}
    </div>
  )
}

export function PasswordField({ showStrength = false, ...props }) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const toggle = (
    <button
      type="button"
      onClick={() => setVisible((v) => !v)}
      aria-label={t(visible ? 'auth.hidePassword' : 'auth.showPassword')}
      aria-pressed={visible}
      className="auth-eye absolute inset-y-0 right-1.5 my-auto grid h-9 w-9 place-items-center rounded-lg text-steel hover:text-ink-soft"
    >
      {visible ? <FaEyeSlash size={15} aria-hidden="true" /> : <FaEye size={15} aria-hidden="true" />}
    </button>
  )
  const hint = showStrength && props.value ? <StrengthMeter password={props.value} /> : props.hint
  return <AuthField {...props} type={visible ? 'text' : 'password'} trailing={toggle} hint={hint} />
}

const STRENGTH_COLORS = ['', 'bg-danger', 'bg-amber', 'bg-accent', 'bg-emerald-500']

// 1–4. Anything under the 6-character minimum is "weak" whatever else it has.
function passwordStrength(password) {
  if (password.length < 6) return 1
  return 1 + [
    password.length >= 10,
    /\d/.test(password) && /\p{L}/u.test(password),
    (/\p{Lu}/u.test(password) && /\p{Ll}/u.test(password)) || /[^\p{L}\d\s]/u.test(password),
  ].filter(Boolean).length
}

function StrengthMeter({ password }) {
  const { t } = useTranslation()
  const score = passwordStrength(password)
  return (
    <div className="mt-2 flex items-center gap-3" aria-live="polite">
      <div className="grid flex-1 grid-cols-4 gap-1">
        {[1, 2, 3, 4].map((level) => (
          <span key={level} className={`h-1 rounded-full transition-colors duration-300 ${level <= score ? STRENGTH_COLORS[score] : 'bg-line'}`} />
        ))}
      </div>
      <span className="spec-strip w-20 text-right text-steel">{t(`auth.strength${score}`)}</span>
    </div>
  )
}

export function MatchHint() {
  const { t } = useTranslation()
  return (
    <span className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700">
      <FaCircleCheck size={11} aria-hidden="true" />
      {t('auth.passwordsMatch')}
    </span>
  )
}

const ERROR_KEYS = {
  INVALID_CREDENTIALS: 'auth.invalidCredentials',
  EMAIL_TAKEN: 'auth.emailTaken',
  TOO_MANY_ATTEMPTS: 'auth.tooManyAttempts',
  API_UNAVAILABLE: 'auth.apiUnavailable',
}

export function AuthError({ code }) {
  const { t } = useTranslation()
  if (!code) return null
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger/6 px-3.5 py-3 text-sm text-danger">
      <FaCircleExclamation className="mt-0.5 shrink-0" size={14} aria-hidden="true" />
      <span>{t(ERROR_KEYS[code] || 'common.error')}</span>
    </div>
  )
}

export function AuthSubmit({ loading, children }) {
  const { t } = useTranslation()
  return (
    <button
      type="submit"
      disabled={loading}
      className="auth-submit btn-glass group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white hover:bg-accent-dim"
    >
      {loading ? (
        <>
          <span className="auth-spinner" aria-hidden="true" />
          {t('common.loading')}
        </>
      ) : (
        <>
          {children}
          <FaArrowRight size={12} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
        </>
      )}
    </button>
  )
}
