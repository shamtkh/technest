import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { loginThunk } from '../store/thunks/loginThunk'
import { clearAuthError } from '../store/slices/authSlice'
import { validateForm, rules, translateError } from '../validations/validateForm'

export default function LoginPage() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { status, error } = useSelector((s) => s.auth)

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})

  async function handleSubmit(e) {
    e.preventDefault()
    dispatch(clearAuthError())
    const schema = { email: [rules.required, rules.email], password: [rules.required] }
    const validationErrors = validateForm(form, schema)
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      return
    }
    const result = await dispatch(loginThunk(form))
    if (loginThunk.fulfilled.match(result)) {
      const dest = result.payload?.role === 'admin'
        ? '/'
        : location.state?.from?.pathname || '/'
      navigate(dest, { replace: true })
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-ink-soft">{t('auth.loginTitle')}</h1>
      <p className="mt-1 text-sm text-steel">{t('auth.loginSubtitle')}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Field label={t('auth.email')} error={translateError(errors.email, t)}>
          <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label={t('auth.password')} error={translateError(errors.password, t)}>
          <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>

        {error && (
          <p className="text-sm text-danger">
              {error === 'INVALID_CREDENTIALS'
                ? t('auth.invalidCredentials')
                : error === 'API_UNAVAILABLE'
                  ? 'Сервер недоступен. Запустите backend и попробуйте снова.'
                  : t('common.error')}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="btn-glass w-full rounded-full bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-dim disabled:opacity-60"
        >
          {status === 'loading' ? t('common.loading') : t('auth.loginBtn')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-steel">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-medium text-accent hover:underline">{t('nav.register')}</Link>
      </p>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-steel">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  )
}
