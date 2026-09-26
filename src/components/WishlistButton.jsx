import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaHeart, FaRegHeart } from 'react-icons/fa6'
import { toggleWishlistThunk } from '../store/thunks/toggleWishlistThunk'
import { useToast } from '../hooks/useToast'

export default function WishlistButton({ productId, variant = 'icon', className = '' }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { showToast } = useToast()
  const isAdmin = useSelector((s) => s.auth.user?.role === 'admin')
  const active = useSelector((s) => s.wishlist.ids.includes(Number(productId)))

  if (isAdmin) return null

  function handleClick(e) {
    // Rendered inside product-card links, so don't let the click navigate.
    e.preventDefault()
    e.stopPropagation()
    dispatch(toggleWishlistThunk(productId))
      .unwrap()
      .then(() => showToast(active ? t('wishlist.removed') : t('wishlist.added'), active ? 'info' : 'success'))
      .catch(() => showToast(t('common.error'), 'error'))
  }

  const label = active ? t('wishlist.remove') : t('wishlist.add')
  const Icon = active ? FaHeart : FaRegHeart

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        aria-label={label}
        title={label}
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-white transition-all hover:scale-[1.03] active:scale-95 ${active ? 'border-red-200 text-red-500' : 'border-line text-steel hover:text-red-500'} ${className}`}
      >
        <Icon size={18} aria-hidden="true" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-realistic backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95 ${active ? 'text-red-500' : 'text-steel hover:text-red-500'} ${className}`}
    >
      <Icon size={15} aria-hidden="true" />
    </button>
  )
}
