import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaCalendar, FaLock, FaPhone, FaUser } from 'react-icons/fa6'
import api from '../api/api'
import { logout, setUser } from '../store/slices/authSlice'
import ConfirmDialog from '../components/ConfirmDialog'
import SavedAddresses from '../components/SavedAddresses'
import { setWishlist } from '../store/slices/wishlistSlice'
import { useToast } from '../hooks/useToast'
import { formatPrice } from '../utils/format'

const STATUS_KEYS = {
  pending: 'statusPending',
  accepted: 'statusAccepted',
  transit: 'statusTransit',
  delivered: 'statusDelivered',
  new: 'statusPending',
  processing: 'statusAccepted',
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const user = useSelector((state) => state.auth.user)
  const isAdmin = user?.role === 'admin'
  const [orders, setOrders] = useState([])
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', currentPassword: '', password: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    api.getMyOrders(userId).then(setOrders).catch(() => setOrders([]))
    api.getUsers().then((users) => {
      const freshUser = users.find((item) => String(item.id) === String(userId))
      if (freshUser) {
        dispatch(setUser(freshUser))
        // Pick up wishlist changes made on the user's other devices.
        if (Array.isArray(freshUser.wishlist)) dispatch(setWishlist(freshUser.wishlist))
        setForm((current) => ({ ...current, name: freshUser.name || '', email: freshUser.email || '', phone: freshUser.phone || '' }))
      }
    }).catch(() => {})
  }, [dispatch, userId])

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (form.password && !form.currentPassword) {
      showToast(t('profile.currentPasswordRequired'), 'error')
      return
    }
    if (form.password && form.password !== form.confirmPassword) {
      showToast(t('profile.passwordMismatch'), 'error')
      return
    }
    setSaving(true)
    try {
      const updated = await api.updateUser(user.id, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        ...(form.password ? { currentPassword: form.currentPassword } : {}),
        ...(form.password ? { password: form.password } : {}),
      })
      dispatch(setUser(updated))
      setForm((current) => ({ ...current, currentPassword: '', password: '', confirmPassword: '' }))
      showToast(`${t('profile.saved')} ✓`, 'success')
    } catch (error) {
      showToast(
        error.message === 'EMAIL_TAKEN'
          ? t('auth.emailTaken')
          : error.message === 'INVALID_CURRENT_PASSWORD'
            ? t('profile.invalidCurrentPassword')
            : t('common.error'),
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  function confirmLogout() {
    dispatch(logout())
    setShowLogoutConfirm(false)
    navigate('/')
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 page-enter">
      <div className="mb-8">
        <p className="spec-strip uppercase text-steel">TechNest</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink-soft sm:text-3xl">{t('profile.title')}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-paper-dim text-accent"><FaUser size={17} /></div>
            <div>
              <h2 className="font-display font-semibold text-ink-soft">{t('profile.personalData')}</h2>
              <p className="text-sm text-steel">{t('profile.personalHint')}</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <ProfileField label={t('auth.name')} value={form.name} onChange={(value) => updateField('name', value)} />
            <ProfileField label={t('auth.email')} type="email" value={form.email} onChange={(value) => updateField('email', value)} />
            {!isAdmin && (
              <ProfileField label={t('profile.phone')} type="tel" value={form.phone} onChange={(value) => updateField('phone', value)} placeholder="+998 90 123 45 67" />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileField label={t('profile.currentPassword')} type="password" value={form.currentPassword} onChange={(value) => updateField('currentPassword', value)} />
              <ProfileField label={t('profile.newPassword')} type="password" value={form.password} onChange={(value) => updateField('password', value)} />
              <ProfileField label={t('auth.confirmPassword')} type="password" value={form.confirmPassword} onChange={(value) => updateField('confirmPassword', value)} />
            </div>
            <button type="submit" disabled={saving} className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-dim disabled:opacity-50">
              {saving ? t('profile.saving') : t('profile.save')}
            </button>
          </form>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
            <h2 className="mb-4 font-display font-semibold text-ink-soft">{t('profile.accountInfo')}</h2>
            <div className="space-y-3 text-sm">
              <InfoRow icon={<FaCalendar />} label={t('profile.registrationDate')} value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString(i18n.language) : '—'} />
              {!isAdmin && <InfoRow icon={<FaPhone />} label={t('profile.phone')} value={user?.phone || t('profile.notAdded')} />}
              <InfoRow icon={<FaLock />} label={t('profile.password')} value="••••••••" />
            </div>
          </section>

          <button type="button" onClick={() => setShowLogoutConfirm(true)} className="w-full rounded-full border border-danger px-5 py-2.5 text-sm font-semibold text-danger hover:bg-red-50">
            {t('nav.logout')}
          </button>
        </div>
      </div>

      {!isAdmin && <SavedAddresses />}

      {!isAdmin && <section className="mt-6 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display font-semibold text-ink-soft">{t('profile.orders')}</h2>
          <button type="button" onClick={() => navigate('/orders')} className="text-sm font-semibold text-accent hover:text-accent-dim">{t('profile.allOrders')}</button>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-steel">{t('orders.empty')}</p>
        ) : (
          <div className="divide-y divide-line">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold text-ink-soft">{t('orders.orderNumber', { id: order.id })}</p>
                  <p className="text-xs text-steel">{new Date(order.createdAt).toLocaleDateString(i18n.language)} · {order.items?.length || 0} {t('profile.items')}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono-tabular font-semibold text-ink-soft">{formatPrice(order.total)} {t('common.currency')}</p>
                  <span className="text-xs font-semibold text-accent">{t(`admin.${STATUS_KEYS[order.status] || STATUS_KEYS.pending}`)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>}

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

function ProfileField({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <label className="block text-sm text-ink-soft">
      <span className="mb-1.5 block text-xs font-semibold text-steel">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="input" />
    </label>
  )
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
      <span className="flex items-center gap-2 text-steel"><span className="text-accent">{icon}</span>{label}</span>
      <span className="text-right font-medium text-ink-soft">{value}</span>
    </div>
  )
}
