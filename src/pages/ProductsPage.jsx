import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getProductsThunk } from '../store/thunks/getProductsThunk'
import ProductCard from '../components/ProductCard'
import PageTransition from '../components/PageTransition'
import GlassSelect from '../components/GlassSelect'

const CATEGORIES = ['phones', 'laptops', 'accessories', 'watches']

export default function ProductsPage() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { items, status } = useSelector((s) => s.products)
  const [params, setParams] = useSearchParams()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const category = params.get('category') || ''
  const brand = params.get('brand') || ''
  const q = params.get('q') || ''
  const sort = params.get('sort') || ''
  const maxPrice = params.get('maxPrice') || ''

  useEffect(() => {
    if (status === 'idle') dispatch(getProductsThunk())
  }, [status, dispatch])

  const brands = useMemo(() => [...new Set(items.map((p) => p.brand))].sort(), [items])
  const priceCeiling = useMemo(() => Math.max(0, ...items.map((p) => p.price)), [items])

  const filtered = useMemo(() => {
    let list = [...items]
    if (category) list = list.filter((p) => p.category === category)
    if (brand) list = list.filter((p) => p.brand === brand)
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
    if (maxPrice) list = list.filter((p) => p.price <= Number(maxPrice))
    if (sort === 'priceAsc') list.sort((a, b) => a.price - b.price)
    if (sort === 'priceDesc') list.sort((a, b) => b.price - a.price)
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating)
    if (sort === 'discount') list = list.filter((p) => p.oldPrice).sort((a, b) => (b.oldPrice - b.price) / b.oldPrice - (a.oldPrice - a.price) / a.oldPrice)
    return list
  }, [items, category, brand, q, sort, maxPrice])

  function updateParam(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  function clearFilters() {
    setParams({})
  }

  const hasActiveFilters = category || brand || maxPrice || q
  const brandOptions = [{ value: '', label: t('categories.all') }, ...brands.map((item) => ({ value: item, label: item }))]
  const sortOptions = [
    { value: '', label: t('products.sortDefault') },
    { value: 'priceAsc', label: t('products.sortPriceAsc') },
    { value: 'priceDesc', label: t('products.sortPriceDesc') },
    { value: 'rating', label: t('products.sortRating') },
  ]

  return (
    <PageTransition>
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-soft">{t('products.title')}</h1>
          <p className="mt-1 spec-strip text-steel">{t('products.resultsCount', { count: filtered.length })}</p>
        </div>
        <button
          onClick={() => setMobileFiltersOpen((v) => !v)}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium lg:hidden"
        >
          Filters
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className={`${mobileFiltersOpen ? 'block' : 'hidden'} lg:block`}>
          <div className="space-y-6 rounded-2xl border border-line bg-white p-5">
            <div>
              <h3 className="mb-3 spec-strip uppercase text-steel">{t('categories.all')}</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => updateParam('category', '')}
                  className={`text-left text-sm ${!category ? 'font-semibold text-accent' : 'text-ink-soft hover:text-accent'}`}
                >
                  {t('categories.all')}
                </button>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateParam('category', c)}
                    className={`text-left text-sm ${category === c ? 'font-semibold text-accent' : 'text-ink-soft hover:text-accent'}`}
                  >
                    {t(`categories.${c}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 spec-strip uppercase text-steel">{t('products.filterBrand')}</h3>
              <GlassSelect value={brand} onChange={(value) => updateParam('brand', value)} options={brandOptions} />
            </div>

            <div>
              <h3 className="mb-3 spec-strip uppercase text-steel">{t('products.filterPrice')}</h3>
              <input
                type="range"
                min={0}
                max={priceCeiling}
                step={100000}
                value={maxPrice || priceCeiling}
                onChange={(e) => updateParam('maxPrice', e.target.value)}
                className="w-full accent-[--color-accent]"
              />
              <div className="mt-1 font-mono-tabular text-xs text-steel">
                ≤ {Number(maxPrice || priceCeiling).toLocaleString('fr-FR').replace(/\u202f/g, ' ')} {t('common.currency')}
              </div>
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="w-full rounded-full border border-line py-2 text-sm font-medium text-danger hover:border-danger">
                {t('products.clearFilters')}
              </button>
            )}
          </div>
        </aside>

        <div>
          <div className="mb-4 flex justify-end">
            <GlassSelect value={sort} onChange={(value) => updateParam('sort', value)} options={sortOptions} className="w-auto min-w-52" />
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-20 text-center">
              <p className="font-display text-lg font-semibold text-ink-soft">{t('products.noResults')}</p>
              <p className="mt-1 text-sm text-steel">{t('products.noResultsHint')}</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-4 rounded-full bg-ink px-5 py-2 text-sm font-medium text-white">
                  {t('products.clearFilters')}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
    </PageTransition>
  )
}
