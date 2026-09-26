import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar } from 'react-chartjs-2'
import { BarController, BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js'
import { formatPrice } from '../../utils/format'

ChartJS.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

const RANGES = [
  { key: 'days14', unit: 'day', count: 14 },
  { key: 'days30', unit: 'day', count: 30 },
  { key: 'weeks12', unit: 'week', count: 12 },
]

function startOfDay(date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

// Monday-based weeks.
function startOfWeek(date) {
  const copy = startOfDay(date)
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7))
  return copy
}

function buildBuckets(orders, range, language) {
  const step = range.unit === 'week' ? 7 : 1
  const last = range.unit === 'week' ? startOfWeek(new Date()) : startOfDay(new Date())
  const buckets = Array.from({ length: range.count }, (_, index) => {
    const start = new Date(last)
    start.setDate(start.getDate() - (range.count - 1 - index) * step)
    return { start, revenue: 0, orders: 0 }
  })
  const first = buckets[0].start
  const formatter = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' })

  orders.forEach((order) => {
    const created = new Date(order.createdAt)
    if (Number.isNaN(created.getTime()) || created < first) return
    const index = Math.floor((startOfDay(created) - first) / (step * 86400000))
    const bucket = buckets[Math.min(index, buckets.length - 1)]
    if (!bucket) return
    bucket.revenue += Number(order.total) || 0
    bucket.orders += 1
  })

  return buckets.map((bucket) => ({ ...bucket, label: formatter.format(bucket.start) }))
}

export default function SalesAnalytics({ orders }) {
  const { t, i18n } = useTranslation()
  const [rangeKey, setRangeKey] = useState('days14')
  const range = RANGES.find((item) => item.key === rangeKey)

  const buckets = useMemo(() => buildBuckets(orders, range, i18n.language), [orders, range, i18n.language])
  const revenue = buckets.reduce((sum, bucket) => sum + bucket.revenue, 0)
  const orderCount = buckets.reduce((sum, bucket) => sum + bucket.orders, 0)
  const periodOrders = useMemo(() => orders.filter((order) => new Date(order.createdAt) >= buckets[0].start), [orders, buckets])
  const discounts = periodOrders.reduce((sum, order) => sum + (Number(order.discount) || 0), 0)

  const topProducts = useMemo(() => {
    const totals = new Map()
    periodOrders.forEach((order) => (order.items || []).forEach((item) => {
      const current = totals.get(item.productId) || { name: item.name, qty: 0, revenue: 0 }
      current.qty += Number(item.qty) || 0
      current.revenue += (Number(item.price) || 0) * (Number(item.qty) || 0)
      totals.set(item.productId, current)
    }))
    return [...totals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  }, [periodOrders])

  const currency = t('common.currency')
  const data = {
    labels: buckets.map((bucket) => bucket.label),
    datasets: [{
      data: buckets.map((bucket) => bucket.revenue),
      backgroundColor: '#3d7fff',
      hoverBackgroundColor: '#2c5fcc',
      borderRadius: { topLeft: 4, topRight: 4 },
      borderSkipped: 'bottom',
      maxBarThickness: 28,
      categoryPercentage: 0.8,
      barPercentage: 0.9,
    }],
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#12161f',
        padding: 10,
        displayColors: false,
        callbacks: {
          title: (items) => (range.unit === 'week' ? `${t('admin.weekOf')} ${items[0].label}` : items[0].label),
          label: (item) => `${t('admin.revenue')}: ${formatPrice(item.raw)} ${currency}`,
          afterLabel: (item) => `${t('admin.statsOrders')}: ${buckets[item.dataIndex].orders}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: '#e4e7ed' },
        ticks: { color: '#8891a3', font: { size: 11 }, maxRotation: 0, autoSkipPadding: 12 },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#eceef2' },
        border: { display: false },
        ticks: {
          color: '#8891a3',
          font: { size: 11 },
          maxTicksLimit: 5,
          callback: (value) => (value >= 1e6 ? `${value / 1e6}M` : value >= 1e3 ? `${value / 1e3}K` : value),
        },
      },
    },
  }

  const kpis = [
    { label: t('admin.revenue'), value: `${formatPrice(revenue)} ${currency}` },
    { label: t('admin.statsOrders'), value: orderCount },
    { label: t('admin.avgOrder'), value: `${formatPrice(orderCount ? Math.round(revenue / orderCount) : 0)} ${currency}` },
    { label: t('admin.discountsGiven'), value: `${formatPrice(discounts)} ${currency}` },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink-soft">{t('admin.salesTitle')}</h2>
        <div className="flex gap-1 rounded-full border border-line bg-white p-1" role="group" aria-label={t('admin.period')}>
          {RANGES.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setRangeKey(item.key)}
              aria-pressed={item.key === rangeKey}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${item.key === rangeKey ? 'bg-ink text-white' : 'text-steel hover:text-ink-soft'}`}
            >
              {t(`admin.${item.key}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-line bg-white p-4">
            <div className="spec-strip text-steel">{kpi.label}</div>
            <div className="mt-2 break-words font-mono-tabular text-lg font-semibold text-ink-soft">{kpi.value}</div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h3 className="font-display text-sm font-semibold text-ink-soft">
          {range.unit === 'week' ? t('admin.revenueByWeek') : t('admin.revenueByDay')}
        </h3>
        <div className="relative mt-4 h-64">
          <Bar data={data} options={options} aria-label={t('admin.revenueByDay')} role="img" />
          {orderCount === 0 && (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-steel">{t('admin.noOrdersInPeriod')}</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h3 className="mb-3 font-display text-sm font-semibold text-ink-soft">{t('admin.topProducts')}</h3>
        {topProducts.length === 0 ? (
          <p className="text-sm text-steel">{t('admin.noData')}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="spec-strip uppercase text-steel">
                <th className="py-2 font-medium">{t('admin.name')}</th>
                <th className="py-2 text-right font-medium">{t('admin.soldQty')}</th>
                <th className="py-2 text-right font-medium">{t('admin.revenue')}</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product) => (
                <tr key={product.name} className="border-t border-line">
                  <td className="py-2 text-ink-soft">{product.name}</td>
                  <td className="py-2 text-right font-mono-tabular text-steel">{product.qty}</td>
                  <td className="py-2 text-right font-mono-tabular text-ink-soft">{formatPrice(product.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
