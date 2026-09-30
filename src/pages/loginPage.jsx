import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaEnvelope, FaLock } from 'react-icons/fa6'
import { loginThunk } from '../store/thunks/loginThunk'
import { clearAuthError } from '../store/slices/authSlice'
import { validateForm, rules, translateError } from '../validations/validateForm'
import AuthLayout from '../components/auth/AuthLayout'
import { AuthError, AuthField, AuthSubmit, PasswordField } from '../components/auth/AuthFields'

export default function LoginPage() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { status, error } = useSelector((s) => s.auth)

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    dispatch(clearAuthError())
  }, [dispatch])

  function update(field) {
    return (e) => {
      setForm({ ...form, [field]: e.target.value })
      if (errors[field]) setErrors({ ...errors, [field]: '' })
    }
  }

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
    <AuthLayout
      mode="login"
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link to="/register" replace state={{ ...location.state, authSwitch: true }} className="font-medium text-accent hover:underline">{t('nav.register')}</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-4">
        <AuthField
          label={t('auth.email')}
          icon={FaEnvelope}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={update('email')}
          error={translateError(errors.email, t)}
        />
        <PasswordField
          label={t('auth.password')}
          icon={FaLock}
          autoComplete="current-password"
          value={form.password}
          onChange={update('password')}
          error={translateError(errors.password, t)}
        />

        <AuthError code={error} />
        <div className="pt-1">
          <AuthSubmit loading={status === 'loading'}>{t('auth.loginBtn')}</AuthSubmit>
        </div>
      </form>
    </AuthLayout>
  )
}
