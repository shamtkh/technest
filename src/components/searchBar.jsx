import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaMagnifyingGlass } from 'react-icons/fa6'

export default function SearchBar({ compact = false, onSubmit }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [value, setValue] = useState(params.get('q') || '')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = value.trim()
    navigate(trimmed ? `/products?q=${encodeURIComponent(trimmed)}` : '/products')
    onSubmit?.()
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? 'w-full' : 'w-full max-w-md'}>
      <div className="search-glass group flex items-center gap-2 rounded-full px-4 py-2.5">
        <FaMagnifyingGlass size={15} className="shrink-0 text-steel" aria-hidden="true" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('nav.searchPlaceholder')}
          className="w-full bg-transparent text-sm text-ink-soft placeholder:text-steel focus:outline-none"
        />
      </div>
    </form>
  )
}
