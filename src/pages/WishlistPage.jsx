import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaRegHeart } from 'react-icons/fa6'
import { getProductsThunk } from '../store/thunks/getProductsThunk'
import ProductCard from '../components/ProductCard'
import PageTransition from '../components/PageTransition'
import { ProductGridSkeleton, Skeleton } from '../components/Skeleton'

export default function WishlistPage() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { items, status } = useSelector((s) => s.products)
  const ids = useSelector((s) => s.wishlist.ids)
  const user = useSelector((s) => s.auth.user)

  useEffect(() => {
    dispatch(getProductsThunk())
  }, [dispatch])

  // Keep wishlist order (most recently added first); skip deleted products.
  const products = ids.map((id) => items.find((product) => product.id === id)).filter(Boolean)

  if (status === 'loading' && items.length === 0) {
    return <PageTransition><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><Skeleton className="mb-6 h-8 w-48" /><ProductGridSkeleton count={4} /></div></PageTransition>
  }

  if (products.length === 0) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-400">
            <FaRegHeart size={24} aria-hidden="true" />
          </div>
          <h1 className="font-display text-xl font-bold text-ink-soft">{t('wishlist.empty')}</h1>
          <p className="mt-2 text-sm text-steel">{t('wishlist.emptyHint')}</p>
          <Link to="/products" className="mt-6 inline-block rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white">
            {t('cart.browse')}
          </Link>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-ink-soft">{t('wishlist.title')}</h1>
          <p className="mt-1 text-sm text-steel">
            {t('wishlist.count', { count: products.length })}
            {!user && <> · <Link to="/login" state={{ from: { pathname: '/wishlist' } }} className="text-accent hover:underline">{t('wishlist.loginToSync')}</Link></>}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </div>
    </PageTransition>
  )
}
