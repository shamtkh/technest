import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import SearchBar from './searchBar'
import { logout } from '../store/slices/authSlice'
import { FaBell, FaHouse, FaMagnifyingGlass, FaBagShopping, FaTableCellsLarge, FaClipboardList, FaUser, FaHeart } from 'react-icons/fa6'
import logo from '../assets/technest-logo-navbar.png'
import BrandLogo from './BrandLogo'
import BurgerMenu from './BurgerMenu'
import ConfirmDialog from './ConfirmDialog'
import { useScrollLock } from '../hooks/useScrollLock'

const LANGS = [
  { code: 'uz', label: "UZ" },
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' },
]

export default function Navbar() {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((s) => s.auth.user)
  const cartCount = useSelector((s) => s.cart.items.reduce((sum, i) => sum + i.qty, 0))
  const newOrdersCount = useSelector((s) => s.orders.newOrdersCount)
  const wishlistCount = useSelector((s) => s.wishlist.ids.length)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  useScrollLock(mobileOpen)

  const isAdmin = user?.role === 'admin'

  function changeLang(code) {
    i18n.changeLanguage(code)
  }

  const activeLanguageIndex = Math.max(0, LANGS.findIndex((language) => language.code === i18n.language))

  function confirmLogout() {
    dispatch(logout())
    setUserMenuOpen(false)
    setMobileOpen(false)
    setLogoutConfirmOpen(false)
    navigate('/')
  }

  function handleLogout() {
    setUserMenuOpen(false)
    setLogoutConfirmOpen(true)
  }

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${isActive ? 'text-ink-soft' : 'text-steel hover:text-ink-soft'}`

  return (
    <>
      <header className="site-header sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="mobile-navbar-brand flex items-center gap-2 shrink-0">
          <BrandLogo src={logo} alt={t('brand')} className="mobile-navbar-logo h-11 w-35 lg:h-14 lg:w-51" />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          <NavLink to="/" end className={linkClass}>{t('nav.home')}</NavLink>
          <NavLink to="/products" className={linkClass}>{t('nav.products')}</NavLink>
        </nav>

        <div className="hidden flex-1 md:block">
          <SearchBar />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden lg:block">
            <div className="language-switch w-fit">
              <span className="language-active-pill" style={{ transform: `translateX(${activeLanguageIndex * 100}%)` }} aria-hidden="true" />
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => changeLang(l.code)}
                  aria-pressed={i18n.language === l.code}
                  className={`language-option ${i18n.language === l.code ? 'is-active' : ''}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `btn-glass hidden h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold uppercase tracking-wider lg:flex ${
                  isActive
                    ? 'border-ink-soft/20 bg-paper-dim/95 text-ink-soft shadow-realistic font-extrabold'
                    : 'border-line bg-white/80 text-steel hover:border-ink-soft/30 hover:text-ink-soft hover:bg-paper/50'
                }`
              }
            >
              <FaTableCellsLarge size={12} className="opacity-80" />
              <span>{t('nav.admin')}</span>
            </NavLink>
          )}

          {/* Wishlist icon — hidden for admin */}
          {!isAdmin && (
            <Link
              to="/wishlist"
              className="navbar-icon relative hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-soft lg:flex"
              aria-label={t('nav.wishlist')}
              title={t('nav.wishlist')}
              style={{ transition: 'border-color 0.2s ease, transform 0.2s ease' }}
            >
              <FaHeart size={16} aria-hidden="true" />
              {wishlistCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 font-mono-tabular text-[10px] font-semibold text-white">
                  {wishlistCount}
                </span>
              )}
            </Link>
          )}

          {/* Cart icon — hidden for admin */}
          {!isAdmin && (
            <Link
              to="/cart"
              className="navbar-icon relative hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-soft lg:flex"
              aria-label={t('nav.cart')}
              style={{ transition: 'border-color 0.2s ease, transform 0.2s ease' }}
            >
              <FaBagShopping size={18} aria-hidden="true" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent px-1 font-mono-tabular text-[10px] font-semibold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          )}

          {/* Admin bell for new orders */}
          {isAdmin && newOrdersCount > 0 && (
            <Link
              to="/admin"
              className="navbar-icon relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink-soft"
              aria-label="New orders"
            >
              <FaBell size={17} aria-hidden="true" />
              <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 font-mono-tabular text-[10px] font-semibold text-white">
                {newOrdersCount}
              </span>
            </Link>
          )}

          {user ? (
            <div className="relative hidden lg:block">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className={`btn-glass flex h-9 items-center gap-2 rounded-full border pl-1 pr-3 text-sm font-medium text-ink-soft ${
                  userMenuOpen ? 'border-ink-soft/30 shadow-realistic bg-paper-dim/95' : 'border-line bg-white hover:border-ink-soft/40'
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-paper-dim font-display text-xs font-bold text-ink-soft">
                  <FaUser size={13} aria-hidden="true" />
                </span>
                <span className="hidden max-w-24 truncate sm:inline">{user.name}</span>
              </button>
              {user.role === 'demo' && (
                <span className="absolute -bottom-5 right-0 whitespace-nowrap text-[9px] font-bold uppercase tracking-wider text-amber-700">
                  {t('demo.badge')}
                </span>
              )}
              {userMenuOpen && (
                <div
                  className="absolute right-0 top-11 w-48 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-realistic-lg modal-enter"
                  onMouseLeave={() => setUserMenuOpen(false)}
                >
                  {/* Orders only for customers */}
                  {!isAdmin && (
                    <Link to="/orders" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-ink-soft hover:bg-paper">
                      {t('nav.orders')}
                    </Link>
                  )}
                  <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-ink-soft hover:bg-paper">
                    {t('nav.profile')}
                  </Link>
                  <button onClick={handleLogout} className="block w-full px-4 py-2 text-left text-sm text-danger hover:bg-paper">
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="btn-glass hidden shrink-0 whitespace-nowrap rounded-full bg-ink px-4 py-2 text-sm font-medium text-white lg:block"
            >
              {t('nav.login')}
            </Link>
          )}

          <BurgerMenu checked={mobileOpen} onChange={setMobileOpen} />
        </div>
      </div>
      </header>

      <div
        className={`mobile-drawer-backdrop lg:hidden ${mobileOpen ? 'is-open' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      >
          <aside className="mobile-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-drawer-header">
              <BrandLogo src={logo} alt={t('brand')} className="mobile-navbar-drawer-logo h-9 w-32 object-cover object-center" />
              <BurgerMenu checked={mobileOpen} onChange={setMobileOpen} />
            </div>
            <div className="mb-5">
            <SearchBar compact onSubmit={() => setMobileOpen(false)} />
            </div>
            <div className="flex flex-col gap-4">
              <NavLink
                to="/"
                end
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `btn-glass flex h-11 items-center gap-3 rounded-xl border px-4 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'border-ink-soft/20 bg-paper-dim/95 text-ink-soft shadow-realistic'
                      : 'border-line bg-white/80 text-steel hover:text-ink-soft hover:bg-paper/50'
                  }`
                }
              >
                <FaHouse size={15} className="opacity-80" />
                <span>{t('nav.home')}</span>
              </NavLink>

              <NavLink
                to="/products"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `btn-glass flex h-11 items-center gap-3 rounded-xl border px-4 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'border-ink-soft/20 bg-paper-dim/95 text-ink-soft shadow-realistic'
                      : 'border-line bg-white/80 text-steel hover:text-ink-soft hover:bg-paper/50'
                  }`
                }
              >
                <FaMagnifyingGlass size={14} className="opacity-80" />
                <span>{t('nav.products')}</span>
              </NavLink>

              {!isAdmin && (
                <NavLink
                  to="/cart"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `btn-glass flex h-11 items-center gap-3 rounded-xl border px-4 text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'border-ink-soft/20 bg-paper-dim/95 text-ink-soft shadow-realistic'
                        : 'border-line bg-white/80 text-steel hover:text-ink-soft hover:bg-paper/50'
                    }`
                  }
                >
                  <div className="relative flex items-center justify-center">
                    <FaBagShopping size={14} className="opacity-80" />
                    {cartCount > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-0.5 font-mono-tabular text-[8px] font-semibold text-white">
                        {cartCount}
                      </span>
                    )}
                  </div>
                  <span>{t('nav.cart')}</span>
                </NavLink>
              )}

              {!isAdmin && (
                <NavLink
                  to="/wishlist"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `btn-glass flex h-11 items-center gap-3 rounded-xl border px-4 text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'border-ink-soft/20 bg-paper-dim/95 text-ink-soft shadow-realistic'
                        : 'border-line bg-white/80 text-steel hover:text-ink-soft hover:bg-paper/50'
                    }`
                  }
                >
                  <FaHeart size={14} className="opacity-80" />
                  <span>{t('nav.wishlist')}</span>
                  {wishlistCount > 0 && <span className="ml-auto font-mono-tabular text-xs text-steel">{wishlistCount}</span>}
                </NavLink>
              )}
            <div className="mobile-drawer-section">
              <div className="mb-2 spec-strip uppercase text-steel">Language</div>
              <div className="language-switch w-fit">
              <span className="language-active-pill" style={{ transform: `translateX(${activeLanguageIndex * 100}%)` }} aria-hidden="true" />
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => changeLang(l.code)}
                  aria-pressed={i18n.language === l.code}
                  className={`language-option ${i18n.language === l.code ? 'is-active' : ''}`}
                >
                  {l.label}
                </button>
              ))}
              </div>
            </div>
            {user ? (
              <div className="mobile-profile-section">
                <button type="button" className="btn-glass flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3 text-left" onClick={() => setUserMenuOpen((value) => !value)}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-dim text-ink-soft"><FaUser size={14} aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-soft">{user.name}</span>
                  <span className={`text-steel transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true">⌄</span>
                </button>
                {userMenuOpen && (
                  <div className="mobile-profile-dropdown">
                    <Link to="/profile" onClick={() => setMobileOpen(false)}>{t('nav.profile')}</Link>
                    {!isAdmin && (
                      <Link to="/orders" onClick={() => setMobileOpen(false)}>{t('nav.orders')}</Link>
                    )}
                    <button type="button" onClick={handleLogout}>{t('nav.logout')}</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-glass rounded-full bg-ink px-4 py-3 text-center text-sm font-semibold text-white">{t('nav.login')}</Link>
            )}
            </div>
          </aside>
      </div>

      <nav className="mobile-tab-bar lg:hidden" aria-label="Mobile navigation">
        <NavLink to="/" end className={({ isActive }) => `mobile-tab${isActive ? ' active' : ''}`}><FaHouse aria-hidden="true" /><span>{t('nav.home')}</span></NavLink>
        <NavLink to="/products" className={({ isActive }) => `mobile-tab${isActive ? ' active' : ''}`}><FaMagnifyingGlass aria-hidden="true" /><span>{t('nav.products')}</span></NavLink>
        {isAdmin ? (
          <NavLink to="/admin" className={({ isActive }) => `mobile-tab${isActive ? ' active' : ''}`}><FaTableCellsLarge aria-hidden="true" /><span>{t('nav.admin')}</span></NavLink>
        ) : (
          <NavLink to="/cart" className={({ isActive }) => `mobile-tab${isActive ? ' active' : ''}`}><FaBagShopping aria-hidden="true" /><span>{t('nav.cart')}</span></NavLink>
        )}
        {user && !isAdmin && <NavLink to="/orders" className={({ isActive }) => `mobile-tab${isActive ? ' active' : ''}`}><FaClipboardList aria-hidden="true" /><span>{t('nav.orders')}</span></NavLink>}
      </nav>

      {logoutConfirmOpen && (
        <ConfirmDialog
          title={t('nav.logoutConfirmTitle')}
          message={t('nav.logoutConfirmMessage')}
          confirmLabel={t('nav.logout')}
          cancelLabel={t('admin.cancel')}
          onConfirm={confirmLogout}
          onCancel={() => setLogoutConfirmOpen(false)}
        />
      )}
    </>
  )
}

