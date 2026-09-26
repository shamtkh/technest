import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FaLocationDot } from 'react-icons/fa6'
import api from '../api/api'
import { setUser } from '../store/slices/authSlice'
import { useToast } from '../hooks/useToast'

const MAX_ADDRESSES = 10
const EMPTY_ADDRESS = { label: '', city: '', street: '', house: '', apartment: '', landmark: '' }

export default function SavedAddresses() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { showToast } = useToast()
  const user = useSelector((s) => s.auth.user)
  const addresses = user?.addresses || []
  const [draft, setDraft] = useState(null) // null = closed; otherwise the address being edited
  const [saving, setSaving] = useState(false)

  async function persist(next, successMessage) {
    setSaving(true)
    try {
      const saved = await api.updateAddresses(user.id, next)
      dispatch(setUser({ ...user, addresses: saved }))
      showToast(successMessage, 'success')
      return true
    } catch {
      showToast(t('common.error'), 'error')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!draft.city.trim() || !draft.street.trim() || !draft.house.trim()) {
      showToast(t('checkout.validationError'), 'error')
      return
    }
    const next = draft.id
      ? addresses.map((address) => (address.id === draft.id ? { ...address, ...draft } : address))
      : [...addresses, { ...draft, id: `addr-${Date.now()}`, isDefault: !addresses.length }]
    if (await persist(next, t('addresses.saved'))) setDraft(null)
  }

  function makeDefault(id) {
    persist(addresses.map((address) => ({ ...address, isDefault: address.id === id })), t('addresses.saved'))
  }

  function remove(id) {
    persist(addresses.filter((address) => address.id !== id), t('addresses.deleted'))
  }

  const field = (key, label, placeholder = '') => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-steel">{label}</span>
      <input value={draft[key]} placeholder={placeholder} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} className="input" />
    </label>
  )

  return (
    <section className="mt-6 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-paper-dim text-accent"><FaLocationDot size={17} aria-hidden="true" /></div>
          <div>
            <h2 className="font-display font-semibold text-ink-soft">{t('addresses.title')}</h2>
            <p className="text-sm text-steel">{t('addresses.hint')}</p>
          </div>
        </div>
        {!draft && addresses.length < MAX_ADDRESSES && (
          <button type="button" onClick={() => setDraft(EMPTY_ADDRESS)} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-soft hover:border-accent hover:text-accent">
            + {t('addresses.add')}
          </button>
        )}
      </div>

      {draft && (
        <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-xl border border-line bg-paper p-4">
          {field('label', t('addresses.label'), t('addresses.labelPlaceholder'))}
          <div className="grid gap-3 sm:grid-cols-2">
            {field('city', t('checkout.city'), t('checkout.cityPlaceholder'))}
            {field('street', t('checkout.street'), t('checkout.streetPlaceholder'))}
            {field('house', t('checkout.house'), t('checkout.housePlaceholder'))}
            {field('apartment', t('checkout.apartment'), t('checkout.apartmentPlaceholder'))}
          </div>
          {field('landmark', t('checkout.landmark'), t('checkout.landmarkPlaceholder'))}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-dim disabled:opacity-50">
              {saving ? t('profile.saving') : t('admin.save')}
            </button>
            <button type="button" onClick={() => setDraft(null)} className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-medium text-ink-soft">
              {t('admin.cancel')}
            </button>
          </div>
        </form>
      )}

      {addresses.length === 0 && !draft ? (
        <p className="text-sm text-steel">{t('addresses.empty')}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <div key={address.id} className={`rounded-xl border p-4 text-sm ${address.isDefault ? 'border-accent' : 'border-line'}`}>
              <div className="flex items-center gap-2 font-semibold text-ink-soft">
                {address.label || t('addresses.untitled')}
                {address.isDefault && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">{t('addresses.default')}</span>}
              </div>
              <p className="mt-1 text-steel">
                {[address.city, address.street, address.house, address.apartment && `kv. ${address.apartment}`].filter(Boolean).join(', ')}
              </p>
              {address.landmark && <p className="text-xs text-steel">{address.landmark}</p>}
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                <button type="button" disabled={saving} onClick={() => setDraft({ ...EMPTY_ADDRESS, ...address })} className="text-accent hover:underline">{t('admin.edit')}</button>
                {!address.isDefault && (
                  <button type="button" disabled={saving} onClick={() => makeDefault(address.id)} className="text-ink-soft hover:underline">{t('addresses.makeDefault')}</button>
                )}
                <button type="button" disabled={saving} onClick={() => remove(address.id)} className="text-danger hover:underline">{t('admin.delete')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
