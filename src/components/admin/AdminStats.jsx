import { useTranslation } from 'react-i18next'
import { FaArrowRight, FaChartLine, FaChevronRight, FaClock, FaCoins, FaTriangleExclamation, FaXmark } from 'react-icons/fa6'
import { formatPrice } from '../../utils/format'

// Same rate as the stock value details dialog.
const UZS_PER_USD = 12600

// Dashboard overview: a dark hero card with the stock value and catalog
// totals, plus four tiles for things that may need action. Tiles light up
// (tinted, pulsing dot) while their number needs attention. Every figure
// opens its details via onSelect(key).
export default function AdminStats({ stats, usersCount, onSelect }) {
  const { t } = useTranslation()

  const figures = [
    { key: 'products', label: t('admin.statsProducts'), value: stats.total },
    { key: 'stock', label: t('admin.statsStock'), value: stats.totalStock },
    { key: 'users', label: t('admin.statsUsers'), value: usersCount },
  ]
  const tiles = [
    { key: 'lowStock', label: t('admin.statsLowStock'), value: stats.lowStock, icon: FaTriangleExclamation, tone: 'amber', alert: stats.lowStock > 0 },
    { key: 'outOfStock', label: t('admin.statsOutOfStock'), value: stats.outOfStock, icon: FaXmark, tone: 'red', alert: stats.outOfStock > 0 },
    { key: 'pending', label: t('admin.statsPending'), value: stats.pendingOrders, icon: FaClock, tone: 'blue', alert: stats.pendingOrders > 0 },
    { key: 'orders', label: t('admin.statsOrders'), value: stats.totalOrders, icon: FaChartLine, tone: 'violet', alert: false },
  ]
  const health = [
    { key: 'healthy', label: t('admin.stockHealthy'), count: stats.total - stats.lowStock - stats.outOfStock, color: 'bg-emerald-400' },
    { key: 'low', label: t('admin.stockLow'), count: stats.lowStock, color: 'bg-amber' },
    { key: 'out', label: t('admin.stockOut'), count: stats.outOfStock, color: 'bg-danger' },
  ]

  return (
    <div className="mb-6 grid gap-3 lg:grid-cols-2">
      <section className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-ink p-5 text-white shadow-realistic-lg sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent/25 blur-3xl" aria-hidden="true" />
        <button type="button" onClick={() => onSelect('value')} className="group relative block w-full text-left">
          <span className="spec-strip flex items-center justify-between gap-3 uppercase text-white/50">
            <span className="flex items-center gap-2">
              <FaCoins className="text-amber" aria-hidden="true" />
              {t('admin.statsValue')}
            </span>
            <FaChevronRight className="text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" aria-hidden="true" />
          </span>
          <span className="mt-3 block font-mono-tabular text-[1.75rem] font-semibold leading-tight sm:text-4xl">
            {formatPrice(stats.stockValue)} <span className="text-base font-medium text-white/50">{t('common.currency')}</span>
          </span>
          <span className="spec-strip mt-1 block text-white/40">≈ ${formatPrice(Math.round(stats.stockValue / UZS_PER_USD))} USD</span>
        </button>

        {/* Desktop fills the card's extra height with how the catalog is stocked. */}
        {stats.total > 0 && (
          <div className="relative mt-8 hidden lg:block">
            <div className="spec-strip mb-2 uppercase text-white/40">{t('admin.stockHealth')}</div>
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-white/10">
              {health.filter((part) => part.count > 0).map((part) => (
                <span key={part.key} className={`${part.color} h-full`} style={{ width: `${(part.count / stats.total) * 100}%` }} />
              ))}
            </div>
            <div className="spec-strip mt-2 flex flex-wrap gap-x-4 gap-y-1 text-white/55">
              {health.map((part) => (
                <span key={part.key} className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${part.color}`} aria-hidden="true" />
                  <span className="text-white">{part.count}</span> {part.label}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="relative mt-6 grid grid-cols-3 gap-1 border-t border-white/10 pt-3">
          {figures.map((figure) => (
            <button key={figure.key} type="button" onClick={() => onSelect(figure.key)} className="min-w-0 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/5 sm:px-3">
              <span className="block font-mono-tabular text-xl font-semibold sm:text-2xl">{formatPrice(figure.value)}</span>
              <span className="mt-0.5 block truncate text-[11px] text-white/50 sm:text-xs">{figure.label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => {
          const Icon = tile.icon
          return (
            <button
              key={tile.key}
              type="button"
              onClick={() => onSelect(tile.key)}
              className={`admin-stat-tile tone-${tile.tone} ${tile.alert ? 'is-alert' : ''}`}
            >
              <span className="admin-stat-icon"><Icon aria-hidden="true" /></span>
              <FaArrowRight className="admin-stat-arrow" aria-hidden="true" />
              <span className="admin-stat-value font-mono-tabular text-2xl font-semibold text-ink-soft lg:text-3xl">{formatPrice(tile.value)}</span>
              <span className="admin-stat-label text-xs font-medium leading-snug text-steel">{tile.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
