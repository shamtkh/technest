import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <div className="font-mono-tabular text-6xl font-bold text-line">404</div>
      <h1 className="mt-4 font-display text-xl font-bold text-ink-soft">{t('common.notFound')}</h1>
      <p className="mt-2 text-sm text-steel">{t('common.notFoundHint')}</p>
      <Link to="/" className="mt-6 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white">
        {t('common.goHome')}
      </Link>
    </div>
  )
}
