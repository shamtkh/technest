import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { createOrderThunk } from '../store/thunks/ordersThunk'
import { getProductsThunk } from '../store/thunks/getProductsThunk'
import { clearCart } from '../store/slices/cartSlice'
import { setUser } from '../store/slices/authSlice'
import { formatPrice } from '../utils/format'
import { useToast } from '../hooks/useToast'
import api from '../api/api'

const ADDRESS_FIELDS = ['city', 'street', 'house', 'apartment', 'landmark']

function sameAddress(a, b) {
  return ADDRESS_FIELDS.every((key) => (a[key] || '').trim().toLowerCase() === (b[key] || '').trim().toLowerCase())
}

function formatAddress(address) {
  return [address.city, address.street, address.house, address.apartment && `kv. ${address.apartment}`].filter(Boolean).join(', ')
}

const REQUIRED = (val, t) => (!val?.toString().trim() ? t('validation.required') : null)
const PHONE_RE = /^\+?[\d\s\-()]{7,}$/
const PHONE_RULE = (val, t) => (val && !PHONE_RE.test(val) ? t('validation.invalidPhone') : null)

function validate(form, t) {
  const errs = {}
  const checks = {
    fullName: [REQUIRED],
    phone: [REQUIRED, PHONE_RULE],
    city: [REQUIRED],
    street: [REQUIRED],
    house: [REQUIRED],
  }
  Object.entries(checks).forEach(([key, rules]) => {
    for (const rule of rules) {
      const err = rule(form[key], t)
      if (err) { errs[key] = err; break }
    }
  })
  return errs
}

export default function CheckoutPage() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const user = useSelector((s) => s.auth.user)
  const items = useSelector((s) => s.cart.items)
  const savedAddresses = user.addresses || []
  const defaultAddress = savedAddresses.find((address) => address.isDefault) || savedAddresses[0]

  const [form, setForm] = useState({
    fullName: user.name || '',
    phone: user.phone || '',
    city: defaultAddress?.city || '',
    street: defaultAddress?.street || '',
    house: defaultAddress?.house || '',
    apartment: defaultAddress?.apartment || '',
    landmark: defaultAddress?.landmark || '',
    payment: 'cash',
  })
  const [errors, setErrors] = useState({})
  const [placing, setPlacing] = useState(false)
  const [placedOrder, setPlacedOrder] = useState(null)
  const [saveAddress, setSaveAddress] = useState(true)
  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState(null) // { code, type, value, discount }
  const [promoError, setPromoError] = useState('')
  const [promoChecking, setPromoChecking] = useState(false)

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const discount = promo ? Math.min(promo.discount, subtotal) : 0
  const total = subtotal - discount
  const isNewAddress = !savedAddresses.some((address) => sameAddress(address, form))

  function promoErrorText(err) {
    const code = err?.message
    if (code === 'PROMO_MIN_TOTAL') return t('promo.PROMO_MIN_TOTAL', { amount: formatPrice(err.data?.minTotal || 0) })
    if (['PROMO_INVALID', 'PROMO_EXPIRED', 'PROMO_USED_UP'].includes(code)) return t(`promo.${code}`)
    return t('common.error')
  }

  async function applyPromo() {
    const code = promoInput.trim()
    if (!code) return
    setPromoChecking(true)
    setPromoError('')
    try {
      const result = await api.validatePromo(code, subtotal)
      setPromo(result)
      setPromoInput('')
      showToast(`${t('promo.applied')}: ${result.code}`, 'success')
    } catch (err) {
      setPromo(null)
      setPromoError(promoErrorText(err))
    } finally {
      setPromoChecking(false)
    }
  }

  function pickAddress(address) {
    setForm((prev) => ({ ...prev, ...Object.fromEntries(ADDRESS_FIELDS.map((key) => [key, address[key] || ''])) }))
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !ADDRESS_FIELDS.includes(key))))
  }

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => { const e = { ...prev }; delete e[key]; return e })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validate(form, t)
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      showToast(t('checkout.validationError'), 'error')
      return
    }

    setPlacing(true)
    try {
      const order = await dispatch(createOrderThunk({
        userId: user.id,
        contact: {
          fullName: form.fullName,
          phone: form.phone,
          city: form.city,
          address: `${form.street}, ${form.house}${form.apartment ? ', kv. ' + form.apartment : ''}${form.landmark ? ', ' + form.landmark : ''}`,
          street: form.street,
          house: form.house,
          apartment: form.apartment,
          landmark: form.landmark,
          payment: form.payment,
        },
        items: items.map((i) => ({
          productId: i.productId,
          name: i.name,
          qty: i.qty,
          price: i.price,
          storage: i.storage,
          color: i.color,
        })),
        total,
        promoCode: promo?.code || null,
      })).unwrap()
      let addresses = savedAddresses
      if (saveAddress && isNewAddress) {
        const address = { id: `addr-${Date.now()}`, label: '', isDefault: !savedAddresses.length, ...Object.fromEntries(ADDRESS_FIELDS.map((key) => [key, form[key].trim()])) }
        addresses = await api.updateAddresses(user.id, [...savedAddresses, address]).catch(() => savedAddresses)
      }
      dispatch(setUser({ ...user, name: form.fullName, phone: form.phone, addresses }))
      dispatch(clearCart())
      dispatch(getProductsThunk({ force: true }))
      showToast(t('checkout.orderSuccess'), 'success', 5000)
      setPlacedOrder(order)
    } catch (err) {
      const message = String(err || '')
      if (message.startsWith('PROMO_')) {
        // The code expired or ran out between applying it and placing the order.
        setPromo(null)
        setPromoError(promoErrorText({ message }))
        showToast(t('promo.removedOnOrder'), 'error')
      } else {
        showToast(t('checkout.orderError'), 'error')
      }
      dispatch(getProductsThunk({ force: true }))
    }
    setPlacing(false)
  }

  if (items.length === 0 && !placedOrder) {
    return <Navigate to="/cart" replace />
  }

  if (placedOrder) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center page-enter">
        <div
          className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.3)' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="#15803d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-bold text-ink-soft">{t('checkout.success')}</h1>
        <p className="mt-2 text-sm text-steel">{t('checkout.successHint')}</p>
        <p className="mt-3 font-mono-tabular text-sm text-ink-soft">{t('orders.orderNumber', { id: placedOrder.id })}</p>
        <button
          onClick={() => navigate('/orders')}
          className="mt-6 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:-translate-y-0.5"
        >
          {t('checkout.backToOrders')}
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 page-enter">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink-soft">{t('checkout.title')}</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-line bg-white p-6">

          {/* Contact Info */}
          <section>
            <h3 className="mb-4 font-display text-sm font-semibold text-ink-soft">{t('checkout.contactInfo')}</h3>
            <div className="space-y-3">
              <Field label={t('checkout.fullName')} error={errors.fullName}>
                <input
                  className="input"
                  value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                  placeholder={t('checkout.fullNamePlaceholder')}
                />
              </Field>
              <Field label={t('checkout.phone')} error={errors.phone}>
                <input
                  className="input"
                  placeholder="+998 90 123 45 67"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                />
              </Field>
            </div>
          </section>

          {/* Delivery Address */}
          <section>
            <h3 className="mb-4 font-display text-sm font-semibold text-ink-soft">{t('checkout.address')}</h3>
            {savedAddresses.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 text-xs font-medium text-steel">{t('addresses.savedTitle')}</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {savedAddresses.map((address) => {
                    const selected = sameAddress(address, form)
                    return (
                      <button
                        key={address.id}
                        type="button"
                        onClick={() => pickAddress(address)}
                        aria-pressed={selected}
                        className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${selected ? 'border-accent bg-accent-soft' : 'border-line hover:border-steel'}`}
                      >
                        <div className="font-semibold text-ink-soft">
                          {address.label || t('addresses.untitled')}
                          {address.isDefault && <span className="ml-2 text-[10px] font-semibold uppercase text-accent">{t('addresses.default')}</span>}
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-xs text-steel">{formatAddress(address)}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="space-y-3">
              <Field label={t('checkout.city')} error={errors.city}>
                <input
                  className="input"
                  placeholder={t('checkout.cityPlaceholder')}
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                />
              </Field>
              <Field label={t('checkout.street')} error={errors.street}>
                <input
                  className="input"
                  placeholder={t('checkout.streetPlaceholder')}
                  value={form.street}
                  onChange={(e) => set('street', e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('checkout.house')} error={errors.house}>
                  <input
                    className="input"
                    placeholder={t('checkout.housePlaceholder')}
                    value={form.house}
                    onChange={(e) => set('house', e.target.value)}
                  />
                </Field>
                <Field label={t('checkout.apartment')}>
                  <input
                    className="input"
                    placeholder={t('checkout.apartmentPlaceholder')}
                    value={form.apartment}
                    onChange={(e) => set('apartment', e.target.value)}
                  />
                </Field>
              </div>
              <Field label={t('checkout.landmark')}>
                <input
                  className="input"
                  placeholder={t('checkout.landmarkPlaceholder')}
                  value={form.landmark}
                  onChange={(e) => set('landmark', e.target.value)}
                />
              </Field>
              {isNewAddress && savedAddresses.length < 10 && (
                <label className="flex items-center gap-2 text-sm text-ink-soft">
                  <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                  {t('addresses.saveForLater')}
                </label>
              )}
            </div>
          </section>

          {/* Payment Method */}
          <section>
            <h3 className="mb-4 font-display text-sm font-semibold text-ink-soft">{t('checkout.paymentMethod')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Cash — active */}
              <button
                type="button"
                onClick={() => set('payment', 'cash')}
                className="rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all"
                style={{
                  borderColor: form.payment === 'cash' ? 'var(--color-ink)' : 'var(--color-line)',
                  backgroundColor: form.payment === 'cash' ? 'var(--color-ink)' : 'transparent',
                  color: form.payment === 'cash' ? 'white' : 'var(--color-ink-soft)',
                }}
              >
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
                  </svg>
                  {t('checkout.payCash')}
                </div>
              </button>

              {/* Card — disabled */}
              <div
                className="relative rounded-xl border border-line px-4 py-3 text-left text-sm font-medium cursor-not-allowed"
                style={{ opacity: 0.5, backgroundColor: 'var(--color-paper-dim)' }}
                title={t('checkout.comingSoon')}
              >
                <div className="flex items-center gap-2 text-steel">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                    <path d="M2 10h20" stroke="currentColor" strokeWidth="1.8"/>
                  </svg>
                  {t('checkout.payCard')}
                </div>
                <span
                  className="absolute -right-1.5 -top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                  style={{ background: 'var(--color-steel)' }}
                >
                  🔒 {t('checkout.comingSoon')}
                </span>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={placing}
            className="btn-glass w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-white hover:bg-accent-dim disabled:opacity-60"
          >
            {placing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" strokeOpacity="0.3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {t('checkout.submitting')}
              </span>
            ) : t('checkout.placeOrder')}
          </button>
        </form>

        {/* Order summary */}
        <div className="h-fit rounded-2xl border border-line bg-white p-5">
          <h3 className="mb-4 font-display text-sm font-semibold text-ink-soft">{t('checkout.orderSummary')}</h3>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.key} className="flex items-center gap-3 text-sm">
                <img src={item.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <div className="flex-1">
                  <div className="text-ink-soft">{item.name}</div>
                  <div className="spec-strip text-steel">{item.qty} × {formatPrice(item.price)}</div>
                  {(item.storage || item.color) && (
                    <div className="spec-strip text-steel">{[item.storage, item.color].filter(Boolean).join(' · ')}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Promo code */}
          <div className="mt-4 border-t border-line pt-4">
            {promo ? (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm">
                <span className="font-mono-tabular font-semibold text-emerald-700">{promo.code}</span>
                <button type="button" onClick={() => setPromo(null)} className="text-xs font-medium text-steel hover:text-danger">{t('promo.remove')}</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  className="input min-w-0 flex-1 uppercase"
                  placeholder={t('promo.placeholder')}
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value); setPromoError('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyPromo() } }}
                  aria-label={t('promo.placeholder')}
                />
                <button type="button" onClick={applyPromo} disabled={promoChecking || !promoInput.trim()} className="shrink-0 rounded-xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-40">
                  {t('promo.apply')}
                </button>
              </div>
            )}
            {promoError && <p className="mt-2 text-xs text-danger">{promoError}</p>}
          </div>

          <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-steel">
              <span>{t('cart.subtotal')}</span>
              <span className="font-mono-tabular">{formatPrice(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>{t('promo.discount')}</span>
                <span className="font-mono-tabular">−{formatPrice(discount)}</span>
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-between border-t border-line pt-4 font-display text-base font-semibold text-ink-soft">
            <span>{t('cart.total')}</span>
            <span className="font-mono-tabular">{formatPrice(total)} {t('common.currency')}</span>
          </div>
        </div>
      </div>
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
