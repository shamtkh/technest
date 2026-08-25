import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { createOrderThunk } from '../store/thunks/ordersThunk'
import { clearCart } from '../store/slices/cartSlice'
import { formatPrice } from '../utils/format'
import { useToast } from '../hooks/useToast'

const REQUIRED = (val) => (!val?.toString().trim() ? 'Maydon to\'ldirilishi shart' : null)
const PHONE_RE = /^\+?[\d\s\-()]{7,}$/
const PHONE_RULE = (val) => (val && !PHONE_RE.test(val) ? 'To\'g\'ri telefon raqam kiriting' : null)

function validate(form) {
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
      const err = rule(form[key])
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

  const [form, setForm] = useState({
    fullName: user?.name || '',
    phone: '',
    city: '',
    street: '',
    house: '',
    apartment: '',
    landmark: '',
    payment: 'cash',
  })
  const [errors, setErrors] = useState({})
  const [placing, setPlacing] = useState(false)
  const [placed, setPlaced] = useState(false)

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => { const e = { ...prev }; delete e[key]; return e })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      showToast('Formadagi xatolarni to\'g\'rilang', 'error')
      return
    }

    setPlacing(true)
    try {
      await dispatch(createOrderThunk({
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
        total: subtotal,
      }))
      dispatch(clearCart())
      showToast('Buyurtmangiz muvaffaqiyatli qabul qilindi! ✓', 'success', 5000)
      setPlaced(true)
    } catch {
      showToast('Buyurtma berishda xato yuz berdi', 'error')
    }
    setPlacing(false)
  }

  if (items.length === 0 && !placed) {
    navigate('/cart')
    return null
  }

  if (placed) {
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
                  placeholder="To'liq ism va familiya"
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
            <h3 className="mb-4 font-display text-sm font-semibold text-ink-soft">Yetkazib berish manzili</h3>
            <div className="space-y-3">
              <Field label={t('checkout.city')} error={errors.city}>
                <input
                  className="input"
                  placeholder="Shahar yoki tuman"
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                />
              </Field>
              <Field label="Ko'cha nomi *" error={errors.street}>
                <input
                  className="input"
                  placeholder="Masalan: Amir Temur ko'chasi"
                  value={form.street}
                  onChange={(e) => set('street', e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Uy/bino raqami *" error={errors.house}>
                  <input
                    className="input"
                    placeholder="Masalan: 42"
                    value={form.house}
                    onChange={(e) => set('house', e.target.value)}
                  />
                </Field>
                <Field label="Kvartira (ixtiyoriy)">
                  <input
                    className="input"
                    placeholder="Masalan: 15"
                    value={form.apartment}
                    onChange={(e) => set('apartment', e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Mo'ljal (ixtiyoriy)">
                <input
                  className="input"
                  placeholder="Masalan: Metro yonida, sariq bino"
                  value={form.landmark}
                  onChange={(e) => set('landmark', e.target.value)}
                />
              </Field>
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
                title="Tez kunda"
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
                  🔒 Tez kunda
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
                Yuborilmoqda...
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
          <div className="mt-4 flex justify-between border-t border-line pt-4 font-display text-base font-semibold text-ink-soft">
            <span>{t('cart.total')}</span>
            <span className="font-mono-tabular">{formatPrice(subtotal)} {t('common.currency')}</span>
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
