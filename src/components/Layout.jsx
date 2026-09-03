import { useLocation, useOutlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Navbar from './navbar'
import Footer from './Footer'
import SupportWidget from './SupportWidget'
import PageTransition from './PageTransition'

export default function Layout() {
  const location = useLocation()
  const outlet = useOutlet()
  const [displayedPage, setDisplayedPage] = useState({ key: location.key, outlet })
  const phase = location.key === displayedPage.key ? 'enter' : 'exit'

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
