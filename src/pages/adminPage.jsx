import { useTranslation } from 'react-i18next'
import AdminDashboard from '../components/adminDashboard'

export default function AdminPage() {
  const { t } = useTranslation()
  return (
    <div className="admin-page-enter mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink-soft">{t('admin.title')}</h1>
      <AdminDashboard />
    </div>
  )
}
