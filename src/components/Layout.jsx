import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './navbar'
import Footer from './Footer'
import SupportWidget from './SupportWidget'

export default function Layout() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar />
      <main className="flex-1 pb-20 lg:pb-0">
        <Outlet />
      </main>
      <Footer />
      <SupportWidget />
    </div>
  )
}
