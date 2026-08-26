import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import logo from '../assets/technest-logo-footer.png'
import { FaTelegram, FaPhone } from 'react-icons/fa6'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-line-dark bg-ink text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <img src={logo} alt={t('brand')} className="h-20 w-72 object-contain object-left" />
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-steel">{t('footer.about')}</p>
          </div>

          <div>
            <h4 className="mb-3 spec-strip uppercase text-steel">{t('footer.shop')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/products?category=phones" className="text-white/80 hover:text-accent">{t('categories.phones')}</Link></li>
              <li><Link to="/products?category=laptops" className="text-white/80 hover:text-accent">{t('categories.laptops')}</Link></li>
              <li><Link to="/products?category=accessories" className="text-white/80 hover:text-accent">{t('categories.accessories')}</Link></li>
              <li><Link to="/products?category=watches" className="text-white/80 hover:text-accent">{t('categories.watches')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 spec-strip uppercase text-steel">{t('footer.support')}</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li>{t('footer.delivery')}</li>
              <li>{t('footer.warranty')}</li>
              <li>{t('footer.returns')}</li>
              <li>
                <a href="https://t.me/TkhrVv1" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-accent">
                  <FaTelegram size={14} aria-hidden="true" />
                  {t('support.telegram')}
                </a>
              </li>
              <li>
                <a href="tel:+998970004525" className="inline-flex items-center gap-2 hover:text-accent">
                  <FaPhone size={12} aria-hidden="true" />
                  +998 97 000 45 25
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 spec-strip uppercase text-steel">{t('footer.newsletterTitle')}</h4>
            <p className="mb-3 text-sm text-white/70">{t('footer.newsletterHint')}</p>
            <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
              <input
                type="email"
                required
                placeholder="email@technest.uz"
                className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-accent"
              />
              <button className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dim">
                {t('footer.subscribe')}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 spec-strip text-white/40 sm:flex-row">
          <span>© {new Date().getFullYear()} TechNest. {t('footer.rights')}</span>
          <span>UZ · RU · EN</span>
        </div>
      </div>
    </footer>
  )
}
