import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { getProductsThunk } from '../store/thunks/getProductsThunk'
import { addItem, decrementQty, incrementQty, removeItem } from '../store/slices/cartSlice'
import ProductCard from '../components/ProductCard'
import PageTransition from '../components/PageTransition'
import { useToast } from '../hooks/useToast'
import { formatPrice } from '../utils/format'
import { getProductFallbackImage, getProductImages } from '../utils/productImages'
import { FaArrowRight, FaBagShopping, FaCheck, FaMinus, FaPlus, FaTrashCan } from 'react-icons/fa6'
import { ProductDetailSkeleton } from '../components/Skeleton'
import WishlistButton from '../components/WishlistButton'
import ProductReviews from '../components/ProductReviews'
import { addViewed } from '../store/slices/recentlyViewedSlice'
import api from '../api/api'
import { firstAvailableVariant } from '../utils/variants'

// Same category first; prefer the same brand and a similar price point.
function getSimilarProducts(product, items) {
  return items
    .filter((item) => item.id !== product.id && item.category === product.category)
    .map((item) => {
      const priceGap = Math.abs(item.price - product.price) / Math.max(product.price, 1)
      const score = (item.brand === product.brand ? 1 : 0) + Math.max(0, 1 - priceGap) + (item.stock > 0 ? 0.5 : 0)
      return { item, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ item }) => item)
}

export default function ProductPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const { showToast } = useToast()
  const { items, status } = useSelector((s) => s.products)
  const cartItems = useSelector((s) => s.cart.items)
  const user = useSelector((s) => s.auth.user)
  const isAdmin = user?.role === 'admin'

  const product = items.find((p) => p.id === Number(id))
  const imageCount = getProductImages(product).length

  const [activeImage, setActiveImage] = useState(0)
  const [storage, setStorage] = useState('')
  const [color, setColor] = useState('')
  const [loadedProductId, setLoadedProductId] = useState(null)
  const [loadedImages, setLoadedImages] = useState({})
  const [boughtTogether, setBoughtTogether] = useState({ productId: null, items: [] })

  useEffect(() => {
    dispatch(getProductsThunk())
    const interval = setInterval(() => dispatch(getProductsThunk()), 15000)
    return () => clearInterval(interval)
  }, [dispatch])

  useEffect(() => {
    dispatch(addViewed(id))
    let cancelled = false
    api.getBoughtTogether(id)
      .then((items) => { if (!cancelled) setBoughtTogether({ productId: Number(id), items }) })
      .catch(() => { if (!cancelled) setBoughtTogether({ productId: Number(id), items: [] }) })
    return () => { cancelled = true }
  }, [dispatch, id])

  if (product && product.id !== loadedProductId) {
    setLoadedProductId(product.id)
    setStorage(product.storage?.[0] || '')
    setColor(product.colors?.[0]?.name || '')
    setActiveImage(0)
    setLoadedImages({})
  }

  // ── Keyboard navigation for gallery ──
  const handleKeyDown = useCallback((e) => {
    if (!product) return
    if (e.key === 'ArrowLeft') setActiveImage((i) => Math.max(0, i - 1))
    if (e.key === 'ArrowRight') setActiveImage((i) => Math.min(imageCount - 1, i + 1))
  }, [product, imageCount])

  // ── Per-variant stock ──
  const variantStock = (() => {
    if (!product) return 0
    if (product.variants && product.variants.length > 0) {
      const v = product.variants.find((v) => v.storage === storage && v.color === color)
      return v ? v.stock : 0
    }
    return product.stock || 0
  })()

  const selectedColor = product?.colors?.find((item) => item.name === color)
  const colorLabel = selectedColor?.names?.[i18n.language] || selectedColor?.names?.ru || color

  const cartItem = cartItems.find(
    (item) => item.productId === product?.id && item.storage === storage && item.color === color
  )

  if (status === 'loading' && !product) {
    return <PageTransition><ProductDetailSkeleton /></PageTransition>
  }

  if (status === 'failed' && !product) {
    return <PageTransition><div className="mx-auto max-w-7xl px-4 py-24 text-center text-steel"><p>{t('common.error')}</p><button onClick={() => dispatch(getProductsThunk())} className="mt-4 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white">{t('common.retry')}</button></div></PageTransition>
  }

  if (!product) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-7xl px-4 py-20 text-center">
          <p className="text-steel">{t('common.notFound')}</p>
          <Link to="/products" className="mt-4 inline-block text-accent hover:underline">{t('common.back')}</Link>
        </div>
      </PageTransition>
    )
  }

  const related = getSimilarProducts(product, items)
  const images = getProductImages(product)
  const bundle = boughtTogether.productId === product.id
    ? boughtTogether.items
      .map(({ productId }) => items.find((item) => item.id === productId))
      .filter((item) => item && item.stock > 0)
      .slice(0, 3)
    : []
  const bundleTotal = bundle.reduce((sum, item) => sum + item.price, product.price)

  function handleAddToCart() {
    if (isAdmin) return
    dispatch(addItem({
      productId: product.id,
      name: product.name,
      image: images[0],
      price: product.price,
      storage,
      color,
      stock: variantStock,
    }))
    showToast(`${product.name} (${color}, ${storage}) ${t('product.addedToast')}`, 'success')
  }

  function handleAddBundle() {
    if (isAdmin) return
    const bundleItems = [product, ...bundle]
    bundleItems.forEach((item) => {
      const variant = item.id === product.id ? { storage, color, stock: variantStock } : firstAvailableVariant(item)
      if (variant.stock <= 0) return
      const alreadyInCart = cartItems.some((cartEntry) => cartEntry.productId === item.id && cartEntry.storage === variant.storage && cartEntry.color === variant.color)
      if (alreadyInCart) return
      dispatch(addItem({
        productId: item.id,
        name: item.name,
        image: getProductImages(item)[0],
        price: item.price,
        ...variant,
      }))
    })
    showToast(t('product.bundleAdded'), 'success')
  }

  function changeCartQuantity(action) {
    if (!cartItem) return
    if (action === 'increment') dispatch(incrementQty(cartItem.key))
    else if (cartItem.qty === 1) dispatch(removeItem(cartItem.key))
    else dispatch(decrementQty(cartItem.key))
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 spec-strip text-steel">
          <Link to="/" className="hover:text-accent">{t('nav.home')}</Link>
          <span className="mx-2">/</span>
          <Link to={`/products?category=${product.category}`} className="hover:text-accent">{t(`categories.${product.category}`)}</Link>
          <span className="mx-2">/</span>
          <span className="text-ink-soft">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Gallery */}
          <div>
            <div
              className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-white cursor-pointer"
              tabIndex={0}
              onKeyDown={handleKeyDown}
              aria-label="Product gallery"
            >
              {!loadedImages[activeImage] && <div className="absolute inset-0 z-[1] bg-paper-dim"><span className="skeleton absolute inset-0 rounded-none" aria-hidden="true" /></div>}
              {images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`${product.name} ${idx + 1}`}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getProductFallbackImage(product); setLoadedImages((loaded) => ({ ...loaded, [idx]: true })) }}
                  onLoad={() => setLoadedImages((loaded) => ({ ...loaded, [idx]: true }))}
                  className="absolute inset-0 h-full w-full object-contain p-4"
                  style={{
                    opacity: idx === activeImage && loadedImages[idx] ? 1 : 0,
                    transform: idx === activeImage ? 'scale(1)' : 'scale(1.02)',
                    transition: 'opacity 0.4s ease, transform 0.4s ease',
                  }}
                />
              ))}

              {/* Arrow navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImage((i) => Math.max(0, i - 1))}
                    disabled={activeImage === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:bg-white disabled:opacity-30"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => setActiveImage((i) => Math.min(images.length - 1, i + 1))}
                    disabled={activeImage === images.length - 1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:bg-white disabled:opacity-30"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {/* Image counter */}
                  <div className="absolute bottom-3 right-3 rounded-full bg-ink/60 backdrop-blur-sm px-2.5 py-1 spec-strip text-white text-[10px]">
                    {activeImage + 1} / {images.length}
                  </div>
                </>
              )}
            </div>



            {/* Thumbnail strip */}
            {imageCount > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    aria-label={`Rasm ${idx + 1}`}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-white p-1 transition-all hover:opacity-100"
                    style={{
                      borderColor: activeImage === idx ? 'var(--color-accent)' : 'var(--color-line)',
                      opacity: activeImage === idx ? 1 : 0.6,
                    }}
                  >
                    <img
                      src={img}
                      alt=""
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getProductFallbackImage(product) }}
                      className="h-full w-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <span className="spec-strip text-steel">{product.brand}</span>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink-soft sm:text-3xl">
              {product.name}
            </h1>

            {/* Rating */}
            <a href="#reviews" className="mt-3 flex w-fit items-center gap-2 hover:opacity-80">
              <div className="flex gap-1 text-amber">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < Math.round(product.rating) ? 'text-amber' : 'text-line'}>★</span>
                ))}
              </div>
              <span className="font-mono-tabular text-sm text-ink-soft">{product.rating}</span>
              <span className="spec-strip text-steel">{t('product.reviews', { count: product.reviews || 0 })}</span>
            </a>

            {/* Price block */}
            <div className="mt-6 flex items-baseline gap-3">
              {product.oldPrice && (
                <span className="font-mono-tabular text-xl text-steel line-through">
                  {formatPrice(product.oldPrice)}
                </span>
              )}
              <span className="font-mono-tabular text-3xl font-bold tracking-tight text-ink-soft">
                {formatPrice(product.price)}
              </span>
              <span className="font-mono text-sm text-steel">{t('common.currency')}</span>
            </div>

            {/* Description */}
            <p className="mt-4 text-sm leading-relaxed text-steel">
              {typeof product.description === 'object'
                ? product.description[i18n.language] || product.description.uz || product.description.ru || product.description.en
                : product.description}
            </p>

            {/* Storage selector */}
            {product.storage?.length > 0 && (
              <div className="mt-6">
                <div className="mb-2 text-sm font-medium text-ink-soft">{t('product.storage')}</div>
                <div className="flex flex-wrap gap-2">
                  {product.storage.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStorage(s)}
                      className="rounded-full border px-4 py-2 font-mono-tabular text-sm"
                      style={{
                        borderColor: storage === s ? 'var(--color-ink)' : 'var(--color-line)',
                        backgroundColor: storage === s ? 'var(--color-ink)' : 'transparent',
                        color: storage === s ? 'white' : 'var(--color-ink-soft)',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color selector */}
            {product.colors?.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 text-sm font-medium text-ink-soft">
                  {t('product.color')}: <span className="text-steel">{colorLabel}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setColor(c.name)}
                      aria-label={c.names?.[i18n.language] || c.names?.ru || c.name}
                      className="h-9 w-9 rounded-full border-2"
                      style={{
                        backgroundColor: c.hex,
                        borderColor: color === c.name ? 'var(--color-accent)' : 'var(--color-line)',
                        transform: color === c.name ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Variant stock badge */}
            <div className="mt-5">
              {variantStock > 0 ? (
                <span
                  className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold"
                  style={{ background: 'rgba(34,197,94,0.10)', color: '#15803d', border: '1px solid rgba(34,197,94,0.25)' }}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  {t('product.inStock', { count: variantStock })}
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold"
                  style={{ background: 'rgba(239,68,68,0.10)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
                  {t('product.outOfStock')}
                </span>
              )}
            </div>

            {/* Actions — hidden for admin */}
            {!isAdmin && (
              <div className="mt-6">
                {cartItem ? (
                  <div className="space-y-3 cart-actions-enter">
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <FaCheck size={9} />
                      </span>
                      <span>{t('product.inCart')}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Quantity selector */}
                      <div className="flex h-12 w-32 shrink-0 items-center justify-between rounded-xl border border-line bg-white px-2 shadow-xs sm:w-44 sm:justify-center">
                        <button
                          onClick={() => changeCartQuantity('decrement')}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-paper text-ink-soft transition-all hover:bg-paper-dim active:scale-95 cursor-pointer"
                          aria-label="Kamaytirish"
                        >
                          {cartItem.qty === 1 ? (
                            <FaTrashCan size={13} className="text-red-500" />
                          ) : (
                            <FaMinus size={11} />
                          )}
                        </button>
                        <span className="min-w-10 text-center font-mono-tabular text-base font-bold text-ink-soft">
                          {cartItem.qty}
                        </span>
                        <button
                          onClick={() => changeCartQuantity('increment')}
                          disabled={cartItem.qty >= (cartItem.stock ?? variantStock)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-paper text-ink-soft transition-all hover:bg-paper-dim active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                          aria-label="Ko'paytirish"
                        >
                          <FaPlus size={11} />
                        </button>
                      </div>

                      <WishlistButton productId={product.id} variant="button" />

                      {/* Go to cart CTA button */}
                      <Link
                        to="/cart"
                        className="group flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-accent-dim hover:shadow active:scale-[0.99] sm:gap-2.5 sm:px-6"
                      >
                        <FaBagShopping size={16} aria-hidden="true" />
                        <span className="truncate">{t('product.goToCart')}</span>
                        <FaArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={handleAddToCart}
                      disabled={variantStock === 0}
                      className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2.5 rounded-xl bg-accent px-8 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-accent-dim hover:shadow active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    >
                      <FaBagShopping size={18} aria-hidden="true" />
                      <span>{t('product.addToCart')}</span>
                    </button>
                    <WishlistButton productId={product.id} variant="button" />
                  </div>
                )}
              </div>
            )}

            {/* Specs table */}
            <div className="mt-8 rounded-2xl border border-line bg-white p-5">
              <h3 className="mb-3 font-display text-sm font-semibold text-ink-soft">{t('product.specs')}</h3>
              <dl className="grid grid-cols-2 gap-y-2 spec-strip">
                {Object.entries(product.specs || {}).map(([key, value]) => (
                  <div key={key} className="contents">
                    <dt className="text-steel">{t(`product.${key}`, { defaultValue: key })}</dt>
                    <dd className="text-ink-soft">{value}</dd>
                  </div>
                ))}
                <div className="contents">
                  <dt className="text-steel">{t('product.brand')}</dt>
                  <dd className="text-ink-soft">{product.brand}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Frequently bought together */}
        {bundle.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-5 font-display text-xl font-bold text-ink-soft">{t('product.boughtTogether')}</h2>
            <div className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-5 lg:flex-row lg:items-center">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                {[product, ...bundle].map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3">
                    {index > 0 && <FaPlus size={12} className="text-steel" aria-hidden="true" />}
                    <Link to={`/products/${item.id}`} className="flex w-28 flex-col items-center gap-2 text-center sm:w-32">
                      <img
                        src={getProductImages(item)[0]}
                        alt={item.name}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getProductFallbackImage(item) }}
                        className="h-24 w-24 rounded-xl border border-line object-contain p-2"
                      />
                      <span className="line-clamp-2 text-xs font-medium text-ink-soft">{item.name}</span>
                      <span className="font-mono-tabular text-xs text-steel">{formatPrice(item.price)}</span>
                    </Link>
                  </div>
                ))}
              </div>
              <div className="shrink-0 border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <div className="text-xs text-steel">{t('product.bundleTotal', { count: bundle.length + 1 })}</div>
                <div className="mt-1 font-mono-tabular text-xl font-bold text-ink-soft">{formatPrice(bundleTotal)} <span className="text-xs font-normal text-steel">{t('common.currency')}</span></div>
                {!isAdmin && (
                  <button onClick={handleAddBundle} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-soft">
                    <FaBagShopping size={14} aria-hidden="true" /> {t('product.addBundle')}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        <ProductReviews key={product.id} product={product} />

        {/* Related products */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-5 font-display text-xl font-bold text-ink-soft">{t('product.related')}</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
