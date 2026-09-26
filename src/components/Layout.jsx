import { useLocation, useOutlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Navbar from './navbar'
import Footer from './Footer'
import SupportWidget from './SupportWidget'
import PageTransition from './PageTransition'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

export default function Layout() {
  const { t } = useTranslation()
  const isDemo = useSelector((state) => state.auth.user?.role === 'demo')
  const location = useLocation()
  const outlet = useOutlet()
  const [displayedPage, setDisplayedPage] = useState({ key: location.key, outlet })
  const phase = location.key === displayedPage.key ? 'enter' : 'exit'
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

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    if (location.key === displayedPage.key) return undefined

    const timeoutId = window.setTimeout(() => {
      setDisplayedPage({ key: location.key, outlet })
    }, 160)

    return () => window.clearTimeout(timeoutId)
  }, [displayedPage.key, location.key, outlet])

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
        <PageTransition key={displayedPage.key} phase={phase}>
          {displayedPage.outlet}
        </PageTransition>
      </main>
      <Footer />
      <SupportWidget />
    </div>
  )
}
