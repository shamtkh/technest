import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaEnvelope, FaLock, FaUser } from 'react-icons/fa6'
import { registerThunk } from '../store/thunks/registerThunk'
import { clearAuthError } from '../store/slices/authSlice'
import { validateForm, rules, translateError } from '../validations/validateForm'
import AuthLayout from '../components/auth/AuthLayout'
import { AuthError, AuthField, AuthSubmit, MatchHint, PasswordField } from '../components/auth/AuthFields'

export default function RegisterPage() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { status, error } = useSelector((s) => s.auth)

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
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
    const schema = {
      name: [rules.required],
      email: [rules.required, rules.email],
      password: [rules.required, rules.minLength(6)],
      confirmPassword: [rules.required, rules.match(form.password)],
    }
    const validationErrors = validateForm(form, schema)
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      return
    }
    const result = await dispatch(registerThunk(form))
    if (registerThunk.fulfilled.match(result)) {
      navigate(location.state?.from?.pathname || '/', { replace: true })
    }
  }

  const passwordsMatch = form.confirmPassword && form.confirmPassword === form.password

  return (
    <AuthLayout
      mode="register"
      title={t('auth.registerTitle')}
      subtitle={t('auth.registerSubtitle')}
      footer={
        <>
          {t('auth.haveAccount')}{' '}
          <Link to="/login" replace state={{ ...location.state, authSwitch: true }} className="font-medium text-accent hover:underline">{t('nav.login')}</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-4">
        <AuthField
          label={t('auth.name')}
          icon={FaUser}
          autoComplete="name"
          value={form.name}
          onChange={update('name')}
          error={translateError(errors.name, t)}
        />
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
          autoComplete="new-password"
          showStrength
          value={form.password}
          onChange={update('password')}
          error={translateError(errors.password, t)}
        />
        <PasswordField
          label={t('auth.confirmPassword')}
          icon={FaLock}
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          error={translateError(errors.confirmPassword, t)}
          hint={passwordsMatch ? <MatchHint /> : null}
        />

        <AuthError code={error} />
        <div className="pt-1">
          <AuthSubmit loading={status === 'loading'}>{t('auth.registerBtn')}</AuthSubmit>
        </div>
      </form>
    </AuthLayout>
  )
}
