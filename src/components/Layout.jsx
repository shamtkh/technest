import { useLocation, useOutlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Navbar from './navbar'
import Footer from './Footer'
import SupportWidget from './SupportWidget'
import PageTransition from './PageTransition'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { useScrollToTop } from '../hooks/useScrollToTop'
import { useAccountCheck } from '../hooks/useAccountCheck'

export default function Layout() {
  const { t } = useTranslation()
  const isDemo = useSelector((state) => state.auth.user?.role === 'demo')
  const location = useLocation()
  const outlet = useOutlet()
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  // Search-param changes (product filters) stay on the same page and keep
  // their scroll position; a new path starts at the top.
  useScrollToTop(location.pathname)
  useAccountCheck()

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar />
      {!online && (
        <div role="status" className="border-b border-line bg-ink px-4 py-2 text-center text-xs font-semibold text-white">
          {t('common.offline')}
        </div>
      )}
      {isDemo && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-semibold tracking-wide text-amber-900">
          <span className="mr-2 rounded-full bg-amber-200 px-2 py-1 text-[10px] font-bold uppercase text-amber-950">{t('demo.badge')}</span>
          {t('demo.notice')}
        </div>
      )}
      <main className="flex-1 pb-20 lg:pb-0">
        {/* The new page replaces the old one right away. Keeping the previous
            page mounted for an exit animation let it react to the new URL and
            auth state: on logout its ProtectedRoute kept redirecting to
            /login in a loop and remounting the login form. Keyed by path so
            filter changes don't remount the page. */}
        <PageTransition key={location.pathname}>
          {outlet}
        </PageTransition>
      </main>
      <Footer />
      <SupportWidget />
    </div>
  )
}
