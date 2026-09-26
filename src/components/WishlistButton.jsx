import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaHeart, FaRegHeart } from 'react-icons/fa6'
import { toggleWishlistThunk } from '../store/thunks/toggleWishlistThunk'
import { useToast } from '../hooks/useToast'

const BURST_DOTS = [0, 60, 120, 180, 240, 300]

export default function WishlistButton({ productId, variant = 'icon', className = '' }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { showToast } = useToast()
  const isAdmin = useSelector((s) => s.auth.user?.role === 'admin')
  const active = useSelector((s) => s.wishlist.ids.includes(Number(productId)))
  // Bumped on every "add" so the burst animation remounts and replays.
  const [burst, setBurst] = useState(0)

  if (isAdmin) return null

  function handleClick(e) {
    // Rendered inside product-card links, so don't let the click navigate.
    e.preventDefault()
    e.stopPropagation()
    if (!active) setBurst((value) => value + 1)
    dispatch(toggleWishlistThunk(productId))
      .unwrap()
      // One shared key: quick repeated taps replace the toast instead of stacking.
      .then(() => showToast(active ? t('wishlist.removed') : t('wishlist.added'), active ? 'info' : 'success', 2000, 'wishlist'))
      .catch(() => showToast(t('common.error'), 'error', 3000, 'wishlist'))
  }

  const label = active ? t('wishlist.remove') : t('wishlist.add')
  const iconSize = variant === 'button' ? 18 : 15
  const shape = variant === 'button'
    ? `h-12 w-12 rounded-xl border bg-white ${active ? 'border-red-200' : 'border-line'}`
    : 'h-9 w-9 rounded-full bg-white/90 shadow-realistic backdrop-blur-sm'

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`wishlist-btn ${active ? 'is-active' : ''} relative flex shrink-0 items-center justify-center ${shape} ${className}`}
    >
      <span className="wishlist-icon" aria-hidden="true">
        <FaRegHeart size={iconSize} className="wishlist-icon-outline" />
        <FaHeart size={iconSize} className="wishlist-icon-fill" />
      </span>
      {burst > 0 && active && (
        <span key={burst} className="wishlist-burst" aria-hidden="true">
          {BURST_DOTS.map((angle) => <i key={angle} style={{ '--angle': `${angle}deg` }} />)}
        </span>
      )}
    </button>
  )
}
