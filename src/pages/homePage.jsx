import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { getProductsThunk } from '../store/thunks/getProductsThunk'
import ProductCard from '../components/ProductCard'
import PageTransition from '../components/PageTransition'
import Reveal from '../components/Reveal'
import { HomePageSkeleton } from '../components/Skeleton'

const CATEGORY_IMAGES = {
  phones: '/HomePageImg.jpg',
  laptops: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=800',
  accessories: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?q=80&w=800',
  watches: 'https://images.unsplash.com/photo-1544117519-31a4b719223d?q=80&w=800',
}

export default function HomePage() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { items, status } = useSelector((s) => s.products)

  useEffect(() => {
    if (status === 'idle') dispatch(getProductsThunk())
  }, [status, dispatch])

  const featured = items.filter((p) => p.featured).slice(0, 4)

  if (status === 'loading' && items.length === 0) return <HomePageSkeleton />
  if (status === 'failed' && items.length === 0) {
    return <div className="mx-auto max-w-7xl px-4 py-24 text-center text-steel"><p>{t('common.error')}</p><button onClick={() => dispatch(getProductsThunk())} className="mt-4 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white">{t('common.retry')}</button></div>
  }

  return (
    <PageTransition>
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">
          <div>
            <span className="spec-strip inline-block rounded-full border border-white/15 px-3 py-1 uppercase text-accent">
              {t('hero.eyebrow')}
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              {t('hero.title')}
            </h1>
            <p className="mt-5 max-w-md text-white/70">{t('hero.subtitle')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products" className="btn-glass rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-dim">
                {t('hero.cta')}
              </Link>
              <Link to="/products?sort=discount" className="btn-glass rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:border-white/40">
                {t('hero.secondaryCta')}
              </Link>
            </div>

            {/* spec-strip signature: technical stat ticker */}
            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-6 spec-strip">
              {[
                [t('hero.stat1Value'), t('hero.stat1Label')],
                [t('hero.stat2Value'), t('hero.stat2Label')],
                [t('hero.stat3Value'), t('hero.stat3Label')],
              ].map(([value, label]) => (
                <div key={label}>
                  <div className="text-xl font-semibold text-white">{value}</div>
                  <div className="mt-1 text-white/50">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-accent/20 blur-3xl" aria-hidden />
            <img
              src="/HomePageImg.jpg"
              alt="Flagship smartphone"
              className="relative w-full rounded-[1.75rem] object-cover shadow-realistic-lg"
            />
            <div className="absolute -bottom-5 -left-5 hidden rounded-2xl bg-white p-4 text-ink-soft shadow-realistic-lg sm:block">
              <div className="spec-strip text-steel">A17 PRO · 48MP</div>
              <div className="font-mono-tabular text-sm font-semibold">iPhone 15 Pro</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <Reveal as="section" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-6 font-display text-2xl font-bold text-ink-soft">{t('home.categoriesTitle')}</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Object.entries(CATEGORY_IMAGES).map(([cat, img]) => (
            <Reveal key={cat} delay={Object.keys(CATEGORY_IMAGES).indexOf(cat) * 55}>
              <Link to={`/products?category=${cat}`} className="group relative block aspect-[4/5] overflow-hidden rounded-2xl">
                <img src={img} alt={t(`categories.${cat}`)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/0" />
                <span className="absolute bottom-4 left-4 font-display text-lg font-semibold text-white">{t(`categories.${cat}`)}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Reveal>

      {/* Featured */}
      <Reveal as="section" className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink-soft">{t('home.featuredTitle')}</h2>
            <p className="mt-1 text-sm text-steel">{t('home.featuredSubtitle')}</p>
          </div>
          <Link to="/products" className="hidden text-sm font-medium text-accent hover:underline sm:block">
            {t('home.viewAll')} →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {featured.map((p, index) => <Reveal key={p.id} delay={index * 65}><ProductCard product={p} /></Reveal>)}
        </div>
      </Reveal>

      {/* Why us */}
      <Reveal as="section" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-8 font-display text-2xl font-bold text-ink-soft">{t('home.whyTitle')}</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: '01', title: t('home.why1Title'), text: t('home.why1Text') },
            { icon: '02', title: t('home.why2Title'), text: t('home.why2Text') },
            { icon: '03', title: t('home.why3Title'), text: t('home.why3Text') },
          ].map((f, index) => (
            <Reveal key={f.icon} delay={index * 65}>
            <div className="rounded-2xl border border-line bg-white p-6">
              <div className="spec-strip text-accent">{f.icon}</div>
              <h3 className="mt-3 font-display text-lg font-semibold text-ink-soft">{f.title}</h3>
              <p className="mt-2 text-sm text-steel">{f.text}</p>
            </div>
            </Reveal>
          ))}
        </div>
      </Reveal>
    </div>
    </PageTransition>
  )
}
