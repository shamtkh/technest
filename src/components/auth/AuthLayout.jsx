import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaBoxOpen, FaHeart, FaHeadset, FaLocationDot } from 'react-icons/fa6'
import { LogoMark } from '../Logo'
import OrderSteps from '../OrderSteps'
import { orderStatusLabel } from '../../utils/orderStatus'

// Shared frame for /login and /register: a dark brand panel (what an account gives you)
// next to the form, with a Sign in / Sign up switch on top of the form.
export default function AuthLayout({ mode, title, subtitle, children, footer }) {
  const { t } = useTranslation()
  const location = useLocation()
  const isLogin = mode === 'login'
  // Animate the switch only when arriving from the other auth page, not on a direct visit.
  const pillClass = location.state?.authSwitch ? (isLogin ? 'to-login' : 'to-register') : ''

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-12">
      <div className="auth-card grid overflow-hidden rounded-[1.75rem] border border-line bg-white lg:grid-cols-[1.05fr_1fr]">
        <aside className="brand-panel relative overflow-hidden px-6 py-7 text-white sm:px-10 lg:px-12 lg:py-12">
          <LogoMark className="pointer-events-none absolute -bottom-16 -right-10 h-80 w-auto text-white/4.5" />

          <div className="relative flex h-full flex-col">
            <span className="spec-strip w-fit rounded-full border border-white/15 px-3 py-1 uppercase text-accent">
              {t('auth.panelEyebrow')}
            </span>
            <h2 className="mt-4 max-w-md font-display text-2xl font-bold leading-[1.1] text-balance sm:text-3xl lg:mt-6 lg:text-[2.6rem]">
              {t(isLogin ? 'auth.loginHeadline' : 'auth.registerHeadline')}
            </h2>
            <p className="mt-3 hidden max-w-sm text-sm leading-relaxed text-white/60 sm:block lg:text-base">
              {t(isLogin ? 'auth.loginLead' : 'auth.registerLead')}
            </p>

            <div className="mt-auto hidden pt-10 lg:block">
              <OrderPreview />
              <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 text-sm text-white/75">
                <Perk icon={FaBoxOpen} text={t('auth.perkTracking')} />
                <Perk icon={FaHeart} text={t('auth.perkWishlist')} />
                <Perk icon={FaLocationDot} text={t('auth.perkAddresses')} />
                <Perk icon={FaHeadset} text={t('auth.perkSupport')} />
              </ul>
            </div>
          </div>
        </aside>

        <section className="flex items-center px-5 py-8 sm:px-10 lg:px-14 lg:py-12">
          <div className="mx-auto w-full max-w-sm">
            <nav className="auth-switch" aria-label={t('auth.panelEyebrow')}>
              <span className={`auth-switch-pill ${isLogin ? '' : 'is-register'} ${pillClass}`} aria-hidden="true" />
              <Link
                to="/login"
                replace
                state={{ ...location.state, authSwitch: true }}
                aria-current={isLogin ? 'page' : undefined}
                className={`auth-switch-option ${isLogin ? 'is-active' : ''}`}
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                replace
                state={{ ...location.state, authSwitch: true }}
                aria-current={isLogin ? undefined : 'page'}
                className={`auth-switch-option ${isLogin ? '' : 'is-active'}`}
              >
                {t('nav.register')}
              </Link>
            </nav>

            <h1 className="mt-8 font-display text-2xl font-bold text-ink-soft sm:text-[1.75rem]">{title}</h1>
            <p className="mt-1.5 text-sm text-steel">{subtitle}</p>

            {children}

            <p className="mt-6 text-center text-sm text-steel">{footer}</p>
          </div>
        </section>
      </div>
    </div>
  )
}

function Perk({ icon: Icon, text }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-accent">
        <Icon size={12} aria-hidden="true" />
      </span>
      <span className="leading-snug">{text}</span>
    </li>
  )
}

// Illustration of order tracking, one of the things an account unlocks.
function OrderPreview() {
  const { t } = useTranslation()
  return (
    <div className="auth-preview max-w-md rounded-2xl border border-white/10 bg-white/6 p-5 backdrop-blur" aria-hidden="true">
      <div className="flex items-center justify-between gap-3">
        <span className="spec-strip text-white/50">{t('orders.orderNumber', { id: 1042 })}</span>
        <span className="spec-strip rounded-full bg-accent/15 px-2.5 py-1 text-accent">{orderStatusLabel(t, 'transit')}</span>
      </div>
      <div className="mt-3 font-display text-lg font-semibold">iPhone 15 Pro</div>
      <div className="spec-strip text-white/50">256 GB · Natural Titanium</div>
      <OrderSteps status="transit" dark className="mt-5" />
    </div>
  )
}
