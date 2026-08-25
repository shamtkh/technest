import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { getMyOrdersThunk } from '../store/thunks/getMyOrdersThunk'
import { formatPrice } from '../utils/format'

const STATUS_CONFIG = {
  pending:   { labelKey: 'statusPending', cls: 'status-pending',   icon: '⏳' },
  accepted:  { labelKey: 'statusAccepted', cls: 'status-accepted',  icon: '✅' },
  transit:   { labelKey: 'statusTransit', cls: 'status-transit',   icon: '🚚' },
  delivered: { labelKey: 'statusDelivered', cls: 'status-delivered', icon: '🎉' },
  // legacy
  new:        { labelKey: 'statusPending', cls: 'status-pending',  icon: '⏳' },
  processing: { labelKey: 'statusAccepted', cls: 'status-accepted',  icon: '🔄' },
}

export default function OrdersPage() {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const { items, status } = useSelector((s) => s.orders)

  useEffect(() => {
    if (user) dispatch(getMyOrdersThunk(user.id))
  }, [user, dispatch])

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-steel page-enter">
        {t('common.loading')}
      </div>
    )
  }

  if (status === 'succeeded' && items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center page-enter">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-paper-dim text-2xl">
          📦
        </div>
        <h1 className="font-display text-xl font-bold text-ink-soft">{t('orders.empty')}</h1>
        <p className="mt-2 text-sm text-steel">{t('orders.emptyHint')}</p>
        <Link to="/products" className="mt-6 inline-block rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white">
          {t('cart.browse')}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 page-enter">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink-soft">{t('orders.title')}</h1>
      <div className="space-y-4">
        {items.map((order) => {
          const si = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
          return (
            <div
              key={order.id}
              className="rounded-2xl border border-line bg-white p-5"
              style={{ transition: 'box-shadow 0.2s ease' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-display text-sm font-semibold text-ink-soft">
                    {t('orders.orderNumber', { id: order.id })}
                  </div>
                  <div className="spec-strip text-steel mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString(i18n.language)}
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1.5 spec-strip font-medium text-xs ${si.cls}`}>
                  {si.icon} {t(`admin.${si.labelKey}`)}
                </span>
              </div>

              {/* Status progress */}
              <div className="mt-4 flex items-center gap-1">
                {['pending', 'accepted', 'transit', 'delivered'].map((s, idx, arr) => {
                  const statuses = ['pending', 'accepted', 'transit', 'delivered']
                  const normalizedStatus = ['new', 'processing'].includes(order.status) ? 'pending' : (order.status || 'pending')
                  const curIdx = statuses.indexOf(normalizedStatus)
                  const done = idx <= curIdx
                  return (
                    <div key={s} className="flex items-center flex-1">
                      <div
                        className="flex-1 h-1 rounded-full"
                        style={{
                          background: done ? 'var(--color-accent)' : 'var(--color-line)',
                          transition: 'background 0.3s ease',
                        }}
                      />
                      {idx === arr.length - 1 && (
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: done ? 'var(--color-accent)' : 'var(--color-line)' }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="mt-1 flex justify-between spec-strip text-steel text-[10px]">
                <span>{t('admin.statusPending')}</span>
                <span>{t('admin.statusAccepted')}</span>
                <span>{t('admin.statusTransit')}</span>
                <span>{t('admin.statusDelivered')}</span>
              </div>

              {/* Items */}
              <div className="mt-4 space-y-2 border-t border-line pt-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-ink-soft">
                      {item.name}
                      {item.storage && <span className="spec-strip text-steel ml-1">· {item.storage}</span>}
                      {item.color && <span className="spec-strip text-steel ml-1">· {item.color}</span>}
                      <span className="spec-strip text-steel ml-1">× {item.qty}</span>
                    </span>
                    <span className="font-mono-tabular text-steel">{formatPrice(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-4 flex justify-between border-t border-line pt-4 font-display text-sm font-semibold text-ink-soft">
                <span>{t('orders.total')}</span>
                <span className="font-mono-tabular">{formatPrice(order.total)} {t('common.currency')}</span>
              </div>

              {/* Address */}
              {order.contact?.address && (
                <div className="mt-2 spec-strip text-steel text-[10px]">
                  📍 {order.contact.city && `${order.contact.city}, `}{order.contact.address}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
