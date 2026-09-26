import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/api'
import { formatPrice } from '../../utils/format'
import { useToast } from '../../hooks/useToast'
import GlassSelect from '../GlassSelect'
import ConfirmDialog from '../ConfirmDialog'

const EMPTY_PROMO = { code: '', type: 'percent', value: '', minTotal: '', maxUses: '', expiresAt: '' }

export default function PromoCodesPanel() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [promos, setPromos] = useState([])
  const [form, setForm] = useState(EMPTY_PROMO)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    api.getPromoCodes().then(setPromos).catch(() => showToast(t('common.error'), 'error'))
  }, [showToast, t])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const created = await api.createPromoCode(form)
      setPromos((current) => [created, ...current])
      setForm(EMPTY_PROMO)
      showToast(`${t('promo.created')}: ${created.code}`, 'success')
    } catch (err) {
      showToast(err.message === 'PROMO_EXISTS' ? t('promo.exists') : t('promo.invalidForm'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(promo) {
    try {
      const updated = await api.updatePromoCode(promo.id, { active: !promo.active })
      setPromos((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch {
      showToast(t('common.error'), 'error')
    }
  }

  async function handleDelete(promo) {
    try {
      await api.deletePromoCode(promo.id)
      setPromos((current) => current.filter((item) => item.id !== promo.id))
      showToast(t('promo.deleted'), 'warning')
    } catch {
      showToast(t('common.error'), 'error')
    } finally {
      setDeleting(null)
    }
  }

  function describe(promo) {
    return promo.type === 'percent' ? `−${promo.value}%` : `−${formatPrice(promo.value)} ${t('common.currency')}`
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-ink-soft">{t('promo.adminTitle')}</h2>

      <form onSubmit={handleCreate} className="grid gap-3 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_0.8fr_1fr_0.8fr_1fr_auto] lg:items-end">
        <Field label={t('promo.code')}>
          <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SALE10" className="input font-mono-tabular uppercase" />
        </Field>
        <Field label={t('promo.type')}>
          <GlassSelect
            value={form.type}
            onChange={(value) => setForm({ ...form, type: value })}
            options={[{ value: 'percent', label: t('promo.percent') }, { value: 'fixed', label: t('promo.fixed') }]}
          />
        </Field>
        <Field label={t('promo.value')}>
          <input required type="number" min="1" max={form.type === 'percent' ? 100 : undefined} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="input" />
        </Field>
        <Field label={t('promo.minTotal')}>
          <input type="number" min="0" value={form.minTotal} onChange={(e) => setForm({ ...form, minTotal: e.target.value })} placeholder="0" className="input" />
        </Field>
        <Field label={t('promo.maxUses')}>
          <input type="number" min="0" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="∞" className="input" />
        </Field>
        <Field label={t('promo.expiresAt')}>
          <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="input" />
        </Field>
        <button type="submit" disabled={saving} className="btn-glass h-11 rounded-full bg-accent px-5 text-sm font-medium text-white hover:bg-accent-dim disabled:opacity-60">
          + {t('promo.create')}
        </button>
      </form>

      <div className="admin-list-surface overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-line spec-strip uppercase text-steel">
              <th className="px-4 py-3">{t('promo.code')}</th>
              <th className="px-4 py-3">{t('promo.discount')}</th>
              <th className="px-4 py-3">{t('promo.minTotal')}</th>
              <th className="px-4 py-3">{t('promo.uses')}</th>
              <th className="px-4 py-3">{t('promo.expiresAt')}</th>
              <th className="px-4 py-3 text-right">{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {promos.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-steel">{t('promo.empty')}</td></tr>
            )}
            {promos.map((promo) => {
              const expired = promo.expiresAt && new Date(`${promo.expiresAt}T23:59:59`) < new Date()
              return (
                <tr key={promo.id} className={`border-b border-line last:border-0 ${!promo.active || expired ? 'opacity-55' : ''}`}>
                  <td className="px-4 py-3 font-mono-tabular font-semibold text-ink-soft">{promo.code}</td>
                  <td className="px-4 py-3 font-mono-tabular text-ink-soft">{describe(promo)}</td>
                  <td className="px-4 py-3 font-mono-tabular text-steel">{promo.minTotal ? formatPrice(promo.minTotal) : '—'}</td>
                  <td className="px-4 py-3 font-mono-tabular text-steel">{promo.uses || 0}{promo.maxUses ? ` / ${promo.maxUses}` : ''}</td>
                  <td className="px-4 py-3 text-steel">{promo.expiresAt || '—'}{expired && <span className="ml-2 text-xs text-danger">{t('promo.expired')}</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => toggleActive(promo)} className="btn-glass rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent">
                        {promo.active ? t('promo.disable') : t('promo.enable')}
                      </button>
                      <button type="button" onClick={() => setDeleting(promo)} className="btn-glass rounded-full border border-line px-3 py-1.5 text-xs font-medium text-danger hover:border-danger">
                        {t('admin.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {deleting && (
        <ConfirmDialog
          title={t('promo.deleteTitle', { code: deleting.code })}
          message={t('promo.deleteConfirm')}
          confirmLabel={t('admin.delete')}
          cancelLabel={t('admin.cancel')}
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-medium text-steel">{label}</span>
      {children}
    </label>
  )
}
