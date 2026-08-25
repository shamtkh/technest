import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { removeItem, incrementQty, decrementQty, clearCart } from '../store/slices/cartSlice'
import { formatPrice } from '../utils/format'
import { useToast } from '../hooks/useToast'
import { FaMinus, FaPlus, FaTrashCan } from 'react-icons/fa6'

export default function CartPage() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const items = useSelector((s) => s.cart.items)
  const user = useSelector((s) => s.auth.user)
  const isAdmin = user?.role === 'admin'
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center page-enter">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6h15l-1.5 9h-12z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M6 6L4.5 3H2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="font-display text-xl font-bold text-ink-soft">{t('cart.loginRequired')}</h1>
        <p className="mt-2 text-sm text-steel">{t('cart.loginRequiredHint')}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/login" state={{ from: { pathname: '/cart' } }} className="btn-glass rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white">
            {t('auth.loginBtn')}
          </Link>
          <Link to="/register" className="btn-glass rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold text-ink-soft">
            {t('auth.registerBtn')}
          </Link>
        </div>
      </div>
    )
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)

  function handleCheckout() {
    navigate(user ? '/checkout' : '/login', { state: { from: { pathname: '/checkout' } } })
  }

  function handleClearCart() {
    dispatch(clearCart())
    setClearConfirmOpen(false)
    showToast(t('cart.cleared'), 'warning')
  }

  // Admin block
  if (isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center page-enter">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber/10">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v4M12 17h.01" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#f59e0b" strokeWidth="1.8"/>
          </svg>
        </div>
        <h1 className="font-display text-xl font-bold text-ink-soft">Admin uchun savat mavjud emas</h1>
        <p className="mt-2 text-sm text-steel">Siz admin sifatida kirgansiz. Faqat foydalanuvchilar savat ishlatishi mumkin.</p>
        <Link to="/admin" className="mt-6 inline-block rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white">
          Admin panelga o'tish
        </Link>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center page-enter">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-paper-dim">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M6 6h15l-1.5 9h-12z" stroke="#8891a3" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M6 6L4.5 3H2" stroke="#8891a3" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="font-display text-xl font-bold text-ink-soft">{t('cart.empty')}</h1>
        <p className="mt-2 text-sm text-steel">{t('cart.emptyHint')}</p>
        <Link to="/products" className="mt-6 inline-block rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white">
          {t('cart.browse')}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="page-enter">
        <h1 className="mb-6 font-display text-2xl font-bold text-ink-soft">{t('cart.title')}</h1>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.key}
              className="card-realistic flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-line bg-white p-4 sm:p-5 transition-all duration-200 hover:border-steel"
            >
              {/* Product thumbnail */}
              <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-xl border border-line/60 bg-paper-dim p-2 flex items-center justify-center overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-contain"
                />
              </div>

              {/* Product Info & Actions */}
              <div className="flex flex-1 flex-col justify-between self-stretch">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-semibold leading-snug text-ink-soft">
                      {item.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 spec-strip text-steel">
                      {[item.storage, item.color].filter(Boolean).map((detail, idx) => (
                        <span key={idx} className="rounded-md bg-paper px-2 py-0.5 text-xs font-medium text-steel">
                          {detail}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      dispatch(removeItem(item.key))
                      showToast(`${item.name} savatdan o'chirildi`, 'warning')
                    }}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-steel transition-colors hover:bg-red-50 hover:text-danger cursor-pointer"
                    aria-label={t('cart.remove')}
                  >
                    <FaTrashCan size={12} />
                    <span>{t('cart.remove')}</span>
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between pt-2 border-t border-line/50">
                  {/* Modern stepper */}
                  <div className="flex h-9 items-center rounded-xl border border-line bg-paper p-0.5 shadow-inner">
                    <button
                      onClick={() => dispatch(decrementQty(item.key))}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-ink-soft shadow-2xs transition-all hover:bg-paper-dim hover:scale-105 active:scale-95 cursor-pointer"
                      aria-label="Kamaytirish"
                    >
                      {item.qty === 1 ? (
                        <FaTrashCan size={11} className="text-red-500" />
                      ) : (
                        <FaMinus size={10} />
                      )}
                    </button>
                    <span className="min-w-8 px-1 text-center font-mono-tabular text-xs font-bold text-ink-soft">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => dispatch(incrementQty(item.key))}
                      disabled={item.qty >= (item.stock ?? 99)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-ink-soft shadow-2xs transition-all hover:bg-paper-dim hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                      aria-label="Ko'paytirish"
                    >
                      <FaPlus size={10} />
                    </button>
                  </div>

                  {/* Price */}
                  <div className="font-mono-tabular text-base font-bold text-ink-soft">
                    {formatPrice(item.price * item.qty)} <span className="text-xs font-normal text-steel">{t('common.currency')}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setClearConfirmOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-danger px-4 py-2 text-sm font-medium text-danger hover:bg-red-50"
            >
              <FaTrashCan size={14} aria-hidden="true" />
              {t('cart.clear')}
            </button>
          </div>
        </div>

        <div className="h-fit rounded-2xl border border-line bg-white p-5">
          <div className="flex justify-between text-sm text-steel">
            <span>{t('cart.subtotal')}</span>
            <span className="font-mono-tabular text-ink-soft">{formatPrice(subtotal)} {t('common.currency')}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm text-steel">
            <span>{t('cart.delivery')}</span>
            <span className="text-ink-soft">{t('cart.deliveryFree')}</span>
          </div>
          <div className="mt-4 flex justify-between border-t border-line pt-4 font-display text-base font-semibold text-ink-soft">
            <span>{t('cart.total')}</span>
            <span className="font-mono-tabular">{formatPrice(subtotal)} {t('common.currency')}</span>
          </div>
          <button
            onClick={handleCheckout}
            className="btn-glass mt-5 w-full rounded-full bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-dim"
          >
            {t('cart.checkout')}
          </button>
        </div>
        </div>
      </div>

      {clearConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/65 p-4 modal-overlay-enter"
          onClick={() => setClearConfirmOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-realistic-lg modal-enter sm:p-7"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-cart-title"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-danger">
              <FaTrashCan size={20} aria-hidden="true" />
            </div>
            <h2 id="clear-cart-title" className="mt-4 text-center font-display text-xl font-bold text-ink-soft">
              {t('cart.clear')}
            </h2>
            <p className="mt-2 text-center text-sm leading-relaxed text-steel">
              {t('cart.clearConfirm')}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setClearConfirmOpen(false)}
                className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-ink-soft hover:bg-paper"
              >
                {t('admin.cancel')}
              </button>
              <button
                type="button"
                onClick={handleClearCart}
                className="rounded-xl bg-danger px-4 py-3 text-sm font-semibold text-white hover:bg-red-600"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
