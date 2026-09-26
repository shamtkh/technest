import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaCamera, FaCircleCheck, FaStar, FaXmark } from 'react-icons/fa6'
import api from '../api/api'
import { resizeImage } from '../core/handlemageChange'
import { getProductsThunk } from '../store/thunks/getProductsThunk'
import { useToast } from '../hooks/useToast'
import { Skeleton } from './Skeleton'
import ConfirmDialog from './ConfirmDialog'

const MAX_PHOTOS = 3
const EMPTY_DRAFT = { rating: 0, text: '', images: [] }

export default function ProductReviews({ product }) {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const { showToast } = useToast()
  const user = useSelector((s) => s.auth.user)
  const isAdmin = user?.role === 'admin'
  const productId = product.id

  const [reviews, setReviews] = useState([])
  const [status, setStatus] = useState('loading')
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hoverRating, setHoverRating] = useState(0)
  const [lightbox, setLightbox] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    api.getReviews(productId)
      .then((data) => { if (!cancelled) { setReviews(data); setStatus('succeeded') } })
      .catch(() => { if (!cancelled) setStatus('failed') })
    return () => { cancelled = true }
  }, [productId])

  const myReview = user ? reviews.find((review) => Number(review.userId) === Number(user.id)) : null
  const canWrite = user && !isAdmin && (!myReview || editing)
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0
  const breakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((review) => review.rating === stars).length,
  }))

  function startEdit() {
    setDraft({ rating: myReview.rating, text: myReview.text, images: myReview.images || [] })
    setEditing(true)
  }

  async function handlePhotos(event) {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'))
    event.target.value = ''
    if (!files.length) return
    const room = MAX_PHOTOS - draft.images.length
    if (room <= 0) { showToast(t('reviews.photosLimit', { count: MAX_PHOTOS }), 'warning'); return }
    const images = await Promise.all(files.slice(0, room).map((file) => resizeImage(file, 720, 0.7)))
    setDraft((current) => ({ ...current, images: [...current.images, ...images].slice(0, MAX_PHOTOS) }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!draft.rating || draft.text.trim().length < 3) {
      showToast(t('reviews.invalid'), 'error')
      return
    }
    setSaving(true)
    try {
      const saved = await api.saveReview({ productId, userId: user.id, ...draft, text: draft.text.trim() })
      setReviews((current) => [saved, ...current.filter((review) => review.id !== saved.id)])
      setDraft(EMPTY_DRAFT)
      setEditing(false)
      showToast(`${t('reviews.saved')} ✓`, 'success')
      // Rating/review count on the product are recomputed server-side.
      dispatch(getProductsThunk({ force: true }))
    } catch {
      showToast(t('common.error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(review) {
    try {
      await api.deleteReview(review.id, user.id)
      setReviews((current) => current.filter((item) => item.id !== review.id))
      if (review.id === myReview?.id) { setEditing(false); setDraft(EMPTY_DRAFT) }
      showToast(t('reviews.deleted'), 'warning')
      dispatch(getProductsThunk({ force: true }))
    } catch {
      showToast(t('common.error'), 'error')
    } finally {
      setDeleting(null)
    }
  }

  const shownRating = hoverRating || draft.rating

  return (
    <section className="mt-16" id="reviews">
      <h2 className="mb-5 font-display text-xl font-bold text-ink-soft">
        {t('reviews.title')} <span className="font-mono-tabular text-base font-medium text-steel">({reviews.length})</span>
      </h2>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Summary + form */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="flex items-end gap-3">
              <span className="font-display text-4xl font-bold text-ink-soft">{reviews.length ? average.toFixed(1) : '—'}</span>
              <div className="pb-1">
                <Stars value={Math.round(average)} />
                <div className="mt-1 text-xs text-steel">{t('reviews.basedOn', { count: reviews.length })}</div>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              {breakdown.map((row) => (
                <div key={row.stars} className="flex items-center gap-2 text-xs text-steel">
                  <span className="w-3 font-mono-tabular">{row.stars}</span>
                  <FaStar size={10} className="text-amber" aria-hidden="true" />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-dim">
                    <div className="h-full rounded-full bg-amber" style={{ width: `${reviews.length ? (row.count / reviews.length) * 100 : 0}%` }} />
                  </div>
                  <span className="w-5 text-right font-mono-tabular">{row.count}</span>
                </div>
              ))}
            </div>
          </div>

          {!user && (
            <div className="rounded-2xl border border-dashed border-line p-5 text-center text-sm text-steel">
              <Link to="/login" state={{ from: { pathname: `/products/${productId}` } }} className="font-semibold text-accent hover:underline">{t('nav.login')}</Link>
              {t('reviews.loginToReview')}
            </div>
          )}

          {myReview && !editing && (
            <div className="rounded-2xl border border-line bg-white p-5 text-sm text-steel">
              <p>{t('reviews.alreadyReviewed')}</p>
              <button type="button" onClick={startEdit} className="mt-3 rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink-soft hover:border-accent hover:text-accent">
                {t('reviews.edit')}
              </button>
            </div>
          )}

          {canWrite && (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-white p-5">
              <h3 className="font-display text-sm font-semibold text-ink-soft">{editing ? t('reviews.editTitle') : t('reviews.writeTitle')}</h3>
              <div className="mt-3 flex gap-1" onMouseLeave={() => setHoverRating(0)} role="radiogroup" aria-label={t('reviews.yourRating')}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={draft.rating === value}
                    aria-label={`${value}/5`}
                    onMouseEnter={() => setHoverRating(value)}
                    onClick={() => setDraft({ ...draft, rating: value })}
                    className="p-0.5 transition-transform hover:scale-110"
                  >
                    <FaStar size={22} className={value <= shownRating ? 'text-amber' : 'text-line'} aria-hidden="true" />
                  </button>
                ))}
              </div>
              <textarea
                rows={4}
                maxLength={2000}
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                placeholder={t('reviews.placeholder')}
                className="input mt-3 resize-none"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {draft.images.map((image, index) => (
                  <div key={index} className="relative">
                    <img src={image} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, images: draft.images.filter((_, i) => i !== index) })}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white"
                      aria-label={t('reviews.removePhoto')}
                    >
                      <FaXmark size={10} aria-hidden="true" />
                    </button>
                  </div>
                ))}
                {draft.images.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-steel hover:border-accent hover:text-accent"
                  >
                    <FaCamera size={16} aria-hidden="true" />
                    <span className="text-[10px]">{t('reviews.addPhotos')}</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotos} className="sr-only" />
              </div>
              <div className="mt-4 flex gap-2">
                <button type="submit" disabled={saving} className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-dim disabled:opacity-50">
                  {saving ? t('profile.saving') : t('reviews.submit')}
                </button>
                {editing && (
                  <button type="button" onClick={() => { setEditing(false); setDraft(EMPTY_DRAFT) }} className="rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink-soft">
                    {t('admin.cancel')}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* List */}
        <div className="space-y-3">
          {status === 'loading' && Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="rounded-2xl border border-line bg-white p-5"><Skeleton className="h-4 w-40" /><Skeleton className="mt-3 h-3 w-full" /><Skeleton className="mt-2 h-3 w-2/3" /></div>
          ))}
          {status === 'failed' && <p className="text-sm text-steel">{t('common.error')}</p>}
          {status === 'succeeded' && reviews.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line px-5 py-12 text-center text-sm text-steel">{t('reviews.empty')}</div>
          )}
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-paper-dim font-display text-xs font-bold text-ink-soft">
                    {(review.userName || '?').trim().charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-ink-soft">{review.userName}</div>
                    <div className="text-[11px] text-steel">{new Date(review.updatedAt || review.createdAt).toLocaleDateString(i18n.language)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {review.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <FaCircleCheck size={10} aria-hidden="true" /> {t('reviews.verified')}
                    </span>
                  )}
                  <Stars value={review.rating} />
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{review.text}</p>
              {review.images?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.images.map((image, index) => (
                    <button key={index} type="button" onClick={() => setLightbox(image)} className="overflow-hidden rounded-lg border border-line">
                      <img src={image} alt={`${t('reviews.photo')} ${index + 1}`} loading="lazy" className="h-20 w-20 object-cover transition-transform hover:scale-105" />
                    </button>
                  ))}
                </div>
              )}
              {user && (isAdmin || Number(review.userId) === Number(user.id)) && (
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={() => setDeleting(review)} className="text-xs font-medium text-danger hover:underline">
                    {t('admin.delete')}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>

      {lightbox && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 modal-overlay-enter" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-h-[85vh] max-w-full rounded-2xl object-contain modal-enter" />
          <button type="button" onClick={() => setLightbox(null)} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-soft" aria-label={t('common.close')}>
            <FaXmark size={16} aria-hidden="true" />
          </button>
        </div>,
        document.body
      )}

      {deleting && (
        <ConfirmDialog
          title={t('reviews.deleteTitle')}
          message={t('reviews.deleteConfirm')}
          confirmLabel={t('admin.delete')}
          cancelLabel={t('admin.cancel')}
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </section>
  )
}

function Stars({ value }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <FaStar key={star} size={12} className={star <= value ? 'text-amber' : 'text-line'} aria-hidden="true" />
      ))}
    </span>
  )
}
