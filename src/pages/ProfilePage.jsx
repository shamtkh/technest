import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaArrowRight, FaArrowRightFromBracket, FaBoxOpen, FaEnvelope, FaGaugeHigh, FaLock, FaPhone, FaShieldHalved, FaUser } from 'react-icons/fa6'
import api from '../api/api'
import { logout, setUser } from '../store/slices/authSlice'
import { setWishlist } from '../store/slices/wishlistSlice'
import { getProductsThunk } from '../store/thunks/getProductsThunk'
import ConfirmDialog from '../components/ConfirmDialog'
import SavedAddresses from '../components/SavedAddresses'
import OrderSteps from '../components/OrderSteps'
import { LogoMark } from '../components/Logo'
import { AuthField, MatchHint, PasswordField } from '../components/auth/AuthFields'
import { useToast } from '../hooks/useToast'
import { formatPrice, initials } from '../utils/format'
import { getProductImages } from '../utils/productImages'
import { orderStatus, orderStatusLabel } from '../utils/orderStatus'
import { validateForm, rules, translateError } from '../validations/validateForm'

export default function ProfilePage() {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state) => state.auth.user)
  const wishlistCount = useSelector((state) => state.wishlist.ids.length)
  const products = useSelector((state) => state.products.items)
  const isAdmin = user?.role === 'admin'
  const [orders, setOrders] = useState([])
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    api.getMyOrders(userId).then(setOrders).catch(() => setOrders([]))
    api.getUser(userId).then((freshUser) => {
      if (freshUser) {
        dispatch(setUser(freshUser))
        // Pick up wishlist changes made on the user's other devices.
        if (Array.isArray(freshUser.wishlist)) dispatch(setWishlist(freshUser.wishlist))
      }
    }).catch(() => {})
  }, [dispatch, userId])

  // Catalog data gives the recent orders their product pictures.
  useEffect(() => {
    if (!isAdmin) dispatch(getProductsThunk())
  }, [dispatch, isAdmin])

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const activeOrder = orders.find((order) => orderStatus(order.status) !== 'delivered')
  const spent = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  function confirmLogout() {
    dispatch(logout())
    setShowLogoutConfirm(false)
    navigate('/')
  }

  function scrollToAddresses(event) {
    event.preventDefault()
    document.getElementById('addresses')?.scrollIntoView({ block: 'start' })
  }

  const personal = (
    // Remount with fresh values whenever the saved data changes (server refresh or save).
    <PersonalCard key={`${user?.name}|${user?.email}|${user?.phone}`} user={user} isAdmin={isAdmin} />
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10 page-enter">
      <section className="brand-panel relative overflow-hidden rounded-[1.75rem] px-5 py-6 text-white sm:px-8 sm:py-8">
        <LogoMark className="pointer-events-none absolute -right-10 -top-12 h-72 w-auto text-white/4.5" />

        <div className="relative flex flex-wrap items-center gap-4 sm:gap-5">
          <Avatar name={user?.name} email={user?.email} />
          <div className="min-w-0 flex-1">
            <span className="spec-strip uppercase text-accent">{isAdmin ? t('profile.roleAdmin') : t('profile.title')}</span>
            <h1 className="mt-1 truncate font-display text-2xl font-bold sm:text-3xl">{user?.name}</h1>
            <p className="mt-0.5 truncate text-sm text-white/60">{user?.email}</p>
            {memberSince && <p className="spec-strip mt-2 text-white/40">{t('profile.memberSince', { date: memberSince })}</p>}
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {isAdmin && (
              <Link to="/admin" className="btn-glass inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-dim">
                <FaGaugeHigh size={13} aria-hidden="true" />
                {t('nav.admin')}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="btn-glass inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold text-white hover:border-white/40"
            >
              <FaArrowRightFromBracket size={13} aria-hidden="true" />
              {t('nav.logout')}
            </button>
          </div>
        </div>

        {!isAdmin && (
          <div className="relative mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
            <Stat to="/orders" value={orders.length} label={t('profile.statOrders')} />
            <Stat
              value={
                <>
                  {/* The full sum doesn't fit a half-width tile on phones. */}
                  <span className="sm:hidden">{new Intl.NumberFormat(i18n.language, { notation: 'compact', maximumFractionDigits: 1 }).format(spent)}</span>
                  <span className="hidden sm:inline">{formatPrice(spent)}</span>
                </>
              }
              unit={t('common.currency')}
              label={t('profile.statSpent')}
            />
            <Stat to="/wishlist" value={wishlistCount} label={t('profile.statWishlist')} />
            <Stat href="#addresses" onClick={scrollToAddresses} value={user?.addresses?.length || 0} label={t('profile.statAddresses')} />
          </div>
        )}
      </section>

      {!isAdmin && activeOrder && (
        <section className="mt-6 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="spec-strip uppercase text-steel">{t('profile.activeOrder')}</span>
              <h2 className="mt-1 font-display text-lg font-semibold text-ink-soft">{t('orders.orderNumber', { id: activeOrder.id })}</h2>
              <p className="mt-0.5 truncate text-sm text-steel">
                {itemsSummary(activeOrder)} · {new Date(activeOrder.createdAt).toLocaleDateString(i18n.language)}
              </p>
            </div>
            <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-dim">
              {t('profile.orderDetails')}
              <FaArrowRight size={11} aria-hidden="true" />
            </Link>
          </div>
          <OrderSteps status={activeOrder.status} className="mt-5" />
        </section>
      )}

      {isAdmin ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {personal}
          <SecurityCard user={user} />
        </div>
      ) : (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-6">
            {personal}
            <SecurityCard user={user} />
          </div>
          <RecentOrders orders={orders} productById={productById} />
        </div>
      )}

      {!isAdmin && (
        <div id="addresses" className="scroll-mt-24">
          <SavedAddresses />
        </div>
      )}

      {showLogoutConfirm && (
        <ConfirmDialog
          title={t('nav.logoutConfirmTitle')}
          message={t('nav.logoutConfirmMessage')}
          confirmLabel={t('nav.logout')}
          cancelLabel={t('admin.cancel')}
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </div>
  )
}

function itemsSummary(order) {
  const [first, ...rest] = order.items || []
  if (!first) return ''
  return rest.length ? `${first.name} +${rest.length}` : first.name
}

function Avatar({ name, email }) {
  return (
    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-accent font-display text-2xl font-bold text-white shadow-[0_12px_32px_rgba(61,127,255,0.35)] sm:h-20 sm:w-20 sm:text-3xl" aria-hidden="true">
      {initials(name || email)}
    </div>
  )
}

function Stat({ to, href, onClick, value, unit, label }) {
  const body = (
    <>
      <span className="block truncate font-mono-tabular text-xl font-semibold sm:text-2xl">
        {value}
        {unit && <span className="ml-1 hidden text-xs font-normal text-white/50 sm:inline">{unit}</span>}
      </span>
      <span className="spec-strip mt-1 block text-white/50">{label}</span>
    </>
  )
  const className = 'block bg-ink/85 px-4 py-4 transition-colors sm:px-5'
  if (to) return <Link to={to} className={`${className} hover:bg-ink/60`}>{body}</Link>
  if (href) return <a href={href} onClick={onClick} className={`${className} hover:bg-ink/60`}>{body}</a>
  return <div className={className}>{body}</div>
}

function Card({ icon: Icon, title, hint, action, children }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper-dim text-accent">
            <Icon size={16} aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-ink-soft">{title}</h2>
            {hint && <p className="text-sm text-steel">{hint}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function PersonalCard({ user, isAdmin }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { showToast } = useToast()
  const saved = { name: user?.name || '', email: user?.email || '', phone: user?.phone || '' }
  const [form, setForm] = useState(saved)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const dirty = Object.keys(saved).some((key) => form[key] !== saved[key])

  function update(field) {
    return (e) => {
      setForm({ ...form, [field]: e.target.value })
      if (errors[field]) setErrors({ ...errors, [field]: '' })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validateForm(form, { name: [rules.required], email: [rules.required, rules.email] })
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      return
    }
    setSaving(true)
    try {
      const updated = await api.updateUser(user.id, { name: form.name, email: form.email, phone: form.phone })
      dispatch(setUser(updated))
      showToast(`${t('profile.saved')} ✓`, 'success')
    } catch (error) {
      showToast(error.message === 'EMAIL_TAKEN' ? t('auth.emailTaken') : t('common.error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card icon={FaUser} title={t('profile.personalData')} hint={t('profile.personalHint')}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthField label={t('auth.name')} icon={FaUser} autoComplete="name" value={form.name} onChange={update('name')} error={translateError(errors.name, t)} />
        <div className={`grid gap-4 ${isAdmin ? '' : 'sm:grid-cols-2'}`}>
          <AuthField label={t('auth.email')} icon={FaEnvelope} type="email" autoComplete="email" value={form.email} onChange={update('email')} error={translateError(errors.email, t)} />
          {!isAdmin && (
            <AuthField label={t('profile.phone')} icon={FaPhone} type="tel" autoComplete="tel" placeholder="+998 90 123 45 67" value={form.phone} onChange={update('phone')} />
          )}
        </div>
        <div className="flex items-center justify-end gap-4 pt-1">
          {dirty && (
            <button type="button" onClick={() => { setForm(saved); setErrors({}) }} className="text-sm font-semibold text-steel hover:text-ink-soft">
              {t('admin.cancel')}
            </button>
          )}
          <button type="submit" disabled={!dirty || saving} className="btn-glass h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-dim">
            {saving ? t('profile.saving') : t('profile.save')}
          </button>
        </div>
      </form>
    </Card>
  )
}

const EMPTY_PASSWORDS = { currentPassword: '', password: '', confirmPassword: '' }

function SecurityCard({ user }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { showToast } = useToast()
  const [form, setForm] = useState(EMPTY_PASSWORDS)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const passwordsMatch = form.confirmPassword && form.confirmPassword === form.password

  function update(field) {
    return (e) => {
      setForm({ ...form, [field]: e.target.value })
      if (errors[field]) setErrors({ ...errors, [field]: '' })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validateForm(form, {
      currentPassword: [rules.required],
      password: [rules.required, rules.minLength(6)],
      confirmPassword: [rules.required, rules.match(form.password)],
    })
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      return
    }
    setSaving(true)
    try {
      // The response carries a fresh session token; other devices get signed out.
      const updated = await api.updateUser(user.id, { currentPassword: form.currentPassword, password: form.password })
      dispatch(setUser(updated))
      setForm(EMPTY_PASSWORDS)
      showToast(`${t('profile.passwordChanged')} ✓`, 'success')
    } catch (error) {
      showToast(
        error.message === 'INVALID_CURRENT_PASSWORD'
          ? t('profile.invalidCurrentPassword')
          : error.message === 'WEAK_PASSWORD'
            ? t('validation.minLength', { min: 6 })
            : t('common.error'),
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card icon={FaShieldHalved} title={t('profile.security')} hint={t('profile.securityHint')}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <PasswordField label={t('profile.currentPassword')} icon={FaLock} autoComplete="current-password" value={form.currentPassword} onChange={update('currentPassword')} error={translateError(errors.currentPassword, t)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField label={t('profile.newPassword')} icon={FaLock} autoComplete="new-password" showStrength value={form.password} onChange={update('password')} error={translateError(errors.password, t)} />
          <PasswordField
            label={t('auth.confirmPassword')}
            icon={FaLock}
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            error={translateError(errors.confirmPassword, t)}
            hint={passwordsMatch ? <MatchHint /> : null}
          />
        </div>
        <div className="flex justify-end pt-1">
          <button type="submit" disabled={saving} className="btn-glass h-11 rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-soft">
            {saving ? t('profile.saving') : t('profile.changePassword')}
          </button>
        </div>
      </form>
    </Card>
  )
}

function RecentOrders({ orders, productById }) {
  const { t, i18n } = useTranslation()
  return (
    <Card
      icon={FaBoxOpen}
      title={t('profile.orders')}
      action={orders.length > 0 && (
        <Link to="/orders" className="shrink-0 pt-2.5 text-sm font-semibold text-accent hover:text-accent-dim">{t('profile.allOrders')}</Link>
      )}
    >
      {orders.length === 0 ? (
        <div className="rounded-xl bg-paper px-5 py-8 text-center">
          <p className="font-semibold text-ink-soft">{t('orders.empty')}</p>
          <p className="mt-1 text-sm text-steel">{t('orders.emptyHint')}</p>
          <Link to="/products" className="btn-glass mt-4 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-dim">
            {t('hero.cta')}
          </Link>
        </div>
      ) : (
        <ul className="-mx-2 space-y-1">
          {orders.slice(0, 5).map((order) => {
            const product = productById.get(order.items?.[0]?.productId)
            const extra = (order.items?.length || 1) - 1
            return (
              <li key={order.id}>
                <Link to="/orders" className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-paper">
                  <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-paper text-steel">
                    {product
                      ? <img src={getProductImages(product)[0]} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
                      : <FaBoxOpen size={16} aria-hidden="true" />}
                    {extra > 0 && (
                      <span className="absolute bottom-0.5 right-0.5 rounded-md bg-ink px-1 text-[0.6rem] font-bold leading-4 text-white">+{extra}</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-soft">{order.items?.[0]?.name || t('orders.orderNumber', { id: order.id })}</span>
                    <span className="spec-strip block text-steel">#{order.id} · {new Date(order.createdAt).toLocaleDateString(i18n.language)}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono-tabular text-sm font-semibold text-ink-soft">
                      {formatPrice(order.total)} <span className="text-xs font-normal text-steel">{t('common.currency')}</span>
                    </span>
                    <span className={`status-${orderStatus(order.status)} mt-1 inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-semibold`}>
                      {orderStatusLabel(t, order.status)}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
