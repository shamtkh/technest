import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaArrowDown, FaArrowUp, FaImage } from 'react-icons/fa6'
import api from '../../api/api'
import { resizeImage } from '../../core/handlemageChange'
import { useToast } from '../../hooks/useToast'
import ConfirmDialog from '../ConfirmDialog'

const LANGS = ['uz', 'ru', 'en']
const EMPTY_BANNER = {
  image: '',
  title: { uz: '', ru: '', en: '' },
  subtitle: { uz: '', ru: '', en: '' },
  link: '/products',
  active: true,
}

export default function BannersPanel() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [banners, setBanners] = useState([])
  const [form, setForm] = useState(EMPTY_BANNER)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    api.getBanners().then(setBanners).catch(() => showToast(t('common.error'), 'error'))
  }, [showToast, t])

  async function handleImage(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !file.type.startsWith('image/')) return
    // Hero images are shown large, so keep more detail than product thumbnails.
    const image = await resizeImage(file, 1400, 0.78)
    setForm((current) => ({ ...current, image }))
  }

  function startEdit(banner) {
    setEditingId(banner.id)
    setForm({
      image: banner.image,
      title: { ...EMPTY_BANNER.title, ...banner.title },
      subtitle: { ...EMPTY_BANNER.subtitle, ...banner.subtitle },
      link: banner.link || '',
      active: banner.active !== false,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_BANNER)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.image) {
      showToast(t('banners.imageRequired'), 'error')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, link: form.link.trim() || '/products' }
      if (editingId) {
        const updated = await api.updateBanner(editingId, payload)
        setBanners((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      } else {
        const order = banners.length ? Math.max(...banners.map((item) => Number(item.order) || 0)) + 1 : 1
        const created = await api.createBanner({ ...payload, order, createdAt: new Date().toISOString() })
        setBanners((current) => [...current, created])
      }
      showToast(t('banners.saved'), 'success')
      resetForm()
    } catch {
      showToast(t('common.error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function patchBanner(banner, changes) {
    const updated = await api.updateBanner(banner.id, changes)
    setBanners((current) => current.map((item) => (item.id === updated.id ? updated : item)))
  }

  async function move(index, direction) {
    const other = banners[index + direction]
    const banner = banners[index]
    if (!other) return
    try {
      const [a, b] = await Promise.all([
        api.updateBanner(banner.id, { order: Number(other.order) || index + direction }),
        api.updateBanner(other.id, { order: Number(banner.order) || index }),
      ])
      setBanners((current) => current
        .map((item) => (item.id === a.id ? a : item.id === b.id ? b : item))
        .sort((x, y) => (Number(x.order) || 0) - (Number(y.order) || 0)))
    } catch {
      showToast(t('common.error'), 'error')
    }
  }

  async function handleDelete(banner) {
    try {
      await api.deleteBanner(banner.id)
      setBanners((current) => current.filter((item) => item.id !== banner.id))
      if (editingId === banner.id) resetForm()
      showToast(t('banners.deleted'), 'warning')
    } catch {
      showToast(t('common.error'), 'error')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink-soft">{t('banners.title')}</h2>
        <p className="mt-1 text-sm text-steel">{t('banners.hint')}</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 rounded-2xl border border-line bg-white p-5 lg:grid-cols-[320px_1fr]">
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-paper text-steel hover:border-accent hover:text-accent"
          >
            {form.image
              ? <img src={form.image} alt="" className="h-full w-full object-cover" />
              : <span className="flex flex-col items-center gap-2 text-sm"><FaImage size={22} aria-hidden="true" />{t('banners.chooseImage')}</span>}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImage} className="sr-only" />
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {LANGS.map((lang) => (
              <label key={`title-${lang}`} className="block">
                <span className="mb-1 block text-xs font-medium text-steel">{t('banners.bannerTitle')} ({lang.toUpperCase()})</span>
                <input value={form.title[lang]} onChange={(e) => setForm({ ...form, title: { ...form.title, [lang]: e.target.value } })} className="input" />
              </label>
            ))}
            {LANGS.map((lang) => (
              <label key={`subtitle-${lang}`} className="block">
                <span className="mb-1 block text-xs font-medium text-steel">{t('banners.subtitle')} ({lang.toUpperCase()})</span>
                <textarea rows={2} value={form.subtitle[lang]} onChange={(e) => setForm({ ...form, subtitle: { ...form.subtitle, [lang]: e.target.value } })} className="input resize-none" />
              </label>
            ))}
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-steel">{t('banners.link')}</span>
            <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="/products?category=phones" className="input" />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            {t('banners.active')}
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-glass rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-dim disabled:opacity-60">
              {editingId ? t('admin.save') : `+ ${t('banners.add')}`}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="btn-glass rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink-soft">
                {t('admin.cancel')}
              </button>
            )}
          </div>
        </div>
      </form>

      {banners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-5 py-12 text-center text-sm text-steel">{t('banners.empty')}</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {banners.map((banner, index) => (
            <article key={banner.id} className={`overflow-hidden rounded-2xl border border-line bg-white ${banner.active === false ? 'opacity-55' : ''}`}>
              <img src={banner.image} alt="" className="aspect-[16/9] w-full object-cover" />
              <div className="space-y-2 p-4">
                <div className="line-clamp-1 font-display text-sm font-semibold text-ink-soft">{banner.title?.ru || banner.title?.uz || banner.title?.en || t('banners.untitled')}</div>
                <div className="truncate text-xs text-steel">{banner.link}</div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="btn-glass rounded-full border border-line p-2 text-steel disabled:opacity-30" aria-label={t('banners.moveUp')}><FaArrowUp size={10} aria-hidden="true" /></button>
                  <button type="button" disabled={index === banners.length - 1} onClick={() => move(index, 1)} className="btn-glass rounded-full border border-line p-2 text-steel disabled:opacity-30" aria-label={t('banners.moveDown')}><FaArrowDown size={10} aria-hidden="true" /></button>
                  <button type="button" onClick={() => patchBanner(banner, { active: banner.active === false }).catch(() => showToast(t('common.error'), 'error'))} className="btn-glass rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent">
                    {banner.active === false ? t('promo.enable') : t('promo.disable')}
                  </button>
                  <button type="button" onClick={() => startEdit(banner)} className="btn-glass rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent">{t('admin.edit')}</button>
                  <button type="button" onClick={() => setDeleting(banner)} className="btn-glass rounded-full border border-line px-3 py-1.5 text-xs font-medium text-danger hover:border-danger">{t('admin.delete')}</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          title={t('banners.deleteTitle')}
          message={t('banners.deleteConfirm')}
          confirmLabel={t('admin.delete')}
          cancelLabel={t('admin.cancel')}
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
