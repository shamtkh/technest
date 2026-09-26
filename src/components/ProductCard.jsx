import { memo, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { formatPrice } from '../utils/format'
import { decrementQty, incrementQty, removeItem } from '../store/slices/cartSlice'
import { getProductFallbackImage, getProductImages } from '../utils/productImages'
import WishlistButton from './WishlistButton'
import { FaArrowLeft, FaArrowRight, FaBagShopping, FaMinus, FaPlus, FaStar, FaTrashCan } from 'react-icons/fa6'

// Memoized: the catalog re-renders on polls, cart changes elsewhere, etc.;
// a card only needs to update when its own product or cart line changes.
export default memo(function ProductCard({ product }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const isAdmin = useSelector((s) => s.auth.user?.role === 'admin')
  const cartItem = useSelector((s) => s.cart.items.find((item) => item.productId === product.id))

  const [activeImage, setActiveImage] = useState(0)
  // Only photos the shopper has actually shown are mounted, so a card loads
  // and decodes one image up front instead of the whole carousel.
  const [shownImages, setShownImages] = useState(() => new Set([0]))
  const [loadedImages, setLoadedImages] = useState({})
  const [isDragging, setIsDragging] = useState(false)
  // Removing the last unit animates the stepper out before the cart changes;
  // the bag button then pops back in.
  const [removing, setRemoving] = useState(false)
  const [bagReturned, setBagReturned] = useState(false)
  const dragStart = useRef(null)

  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0

  const images = getProductImages(product)

  function showImage(index) {
    setActiveImage(index)
    setShownImages((shown) => (shown.has(index) ? shown : new Set(shown).add(index)))
  }

  const prevIndex = activeImage === 0 ? images.length - 1 : activeImage - 1
  const nextIndex = activeImage === images.length - 1 ? 0 : activeImage + 1

  function prevImage(e) {
    e.preventDefault()
    e.stopPropagation()
    showImage(prevIndex)
  }

  function nextImage(e) {
    e.preventDefault()
    e.stopPropagation()
    showImage(nextIndex)
  }

  function handleDotClick(e, idx) {
    e.preventDefault()
    e.stopPropagation()
    showImage(idx)
  }

  function handlePointerDown(e) {
    dragStart.current = e.clientX
    setIsDragging(false)
  }

  function handlePointerUp(e) {
    if (dragStart.current === null) return
    const delta = e.clientX - dragStart.current
    dragStart.current = null
    if (Math.abs(delta) > 40) {
      setIsDragging(true)
      showImage(delta < 0 ? nextIndex : prevIndex)
    }
  }

  function changeQuantity(e, action) {
    e.preventDefault()
    e.stopPropagation()
    if (!cartItem || removing) return
    if (action === 'increment') dispatch(incrementQty(cartItem.key))
    else if (cartItem.qty === 1) removeFromCart(cartItem.key)
    else dispatch(decrementQty(cartItem.key))
  }

  function removeFromCart(key) {
    setRemoving(true)
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 360
    setTimeout(() => {
      dispatch(removeItem(key))
      setRemoving(false)
      setBagReturned(true)
    }, delay)
  }

  return (
    <Link
      to={`/products/${product.id}`}
      className="card-realistic sheen group flex flex-col overflow-hidden rounded-2xl"
      onClick={(e) => { if (isDragging) e.preventDefault() }}
    >
      {/* Image carousel */}
      <div
        className="relative aspect-square overflow-hidden bg-paper-dim select-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {!loadedImages[activeImage] && <div className="absolute inset-0 z-[1] bg-paper-dim"><span className="skeleton absolute inset-0 rounded-none" aria-hidden="true" /></div>}
        {images.map((img, idx) => shownImages.has(idx) && (
          <img
            key={idx}
            src={img}
            alt={product.name}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getProductFallbackImage(product) }}
            onLoad={() => setLoadedImages((loaded) => ({ ...loaded, [idx]: true }))}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain p-3"
            style={{
              opacity: idx === activeImage && loadedImages[idx] ? 1 : 0,
              transition: 'opacity 0.35s ease',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Discount badge */}
        {discount > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-amber px-2.5 py-1 font-mono-tabular text-[11px] font-semibold text-ink z-10">
            -{discount}%
          </span>
        )}

        {/* Wishlist */}
        {!isAdmin && (
          <div className="absolute right-3 top-3 z-20">
            <WishlistButton productId={product.id} />
          </div>
        )}

        {/* Out of stock overlay */}
        {product.stock === 0 && (
          <span className="absolute inset-0 flex items-center justify-center bg-ink/60 spec-strip uppercase text-white z-10">
            {t('product.outOfStock')}
          </span>
        )}

        {/* Navigation arrows — show on hover if multiple images */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
              aria-label="Previous image"
            >
              <FaArrowLeft size={12} aria-hidden="true" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
              aria-label="Next image"
            >
              <FaArrowRight size={12} aria-hidden="true" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => handleDotClick(e, idx)}
                  aria-label={`Image ${idx + 1}`}
                  className={`carousel-dot ${idx === activeImage ? 'active' : ''}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <div className="flex items-center justify-between spec-strip text-steel">
          <span>{product.brand}</span>
          <span className="flex items-center gap-1">
            <FaStar size={11} color="#ffb020" aria-hidden="true" />
            {product.rating}
          </span>
        </div>
        <h3 className="font-display text-sm font-semibold leading-snug text-ink-soft">
          {product.name}
        </h3>

        <div className="mt-1 flex min-w-0 items-center gap-2 spec-strip text-steel">
          <span className="truncate">{product.specs.chip}</span>
          {product.specs.ram !== '—' && <span className="shrink-0">· {product.specs.ram}</span>}
        </div>

        <div className={`card-price-row mt-auto flex items-end justify-between gap-x-1.5 pt-3 sm:gap-x-2 ${cartItem ? 'flex-wrap' : 'flex-nowrap'}`}>
          <div className="min-w-0">
            {product.oldPrice && (
              <div className="whitespace-nowrap font-mono-tabular text-[11px] text-steel line-through sm:text-xs">
                {formatPrice(product.oldPrice)}
              </div>
            )}
            <div className="card-price whitespace-nowrap font-mono-tabular font-semibold text-ink-soft">
              {formatPrice(product.price)} <span className="text-[0.7em] font-normal text-steel max-[359px]:hidden">{t('common.currency')}</span>
            </div>
          </div>

          {!isAdmin && !cartItem && product.stock > 0 && (
            // Part of the card link: opens the product page to pick storage/color.
            <span
              aria-hidden="true"
              title={t('product.viewDetails')}
              className={`${bagReturned ? 'card-bag-pop ' : ''}flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-realistic transition-all duration-200 group-hover:scale-105 group-hover:bg-accent-dim sm:h-9 sm:w-9`}
            >
              <FaBagShopping size={13} />
            </span>
          )}

          {!isAdmin && cartItem && (
            <div className={`card-stepper-wrap ${removing ? 'is-removing' : ''}`}>
            <div>
            <div
              className="mt-2 flex h-9 items-center rounded-xl border border-line bg-paper p-0.5 shadow-inner"
              onClick={(e) => e.preventDefault()}
            >
              <button
                onClick={(e) => changeQuantity(e, 'decrement')}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-ink-soft shadow-2xs transition-all hover:bg-paper-dim hover:scale-105 active:scale-95 cursor-pointer"
                aria-label="Kamaytirish"
              >
                {cartItem.qty === 1 ? (
                  <FaTrashCan size={11} className="text-red-500" />
                ) : (
                  <FaMinus size={10} />
                )}
              </button>
              <span className="min-w-7 px-1 text-center font-mono-tabular text-xs font-bold text-ink-soft">
                {cartItem.qty}
              </span>
              <button
                onClick={(e) => changeQuantity(e, 'increment')}
                disabled={cartItem.qty >= (cartItem.stock ?? 99)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-ink-soft shadow-2xs transition-all hover:bg-paper-dim hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                aria-label="Ko'paytirish"
              >
                <FaPlus size={10} />
              </button>
            </div>
            </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
})
