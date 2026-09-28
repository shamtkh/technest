import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6'
import SmartLink from './SmartLink'

const AUTOPLAY_MS = 6000

const pad = (value) => String(value).padStart(2, '0')

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Swipeable hero banner slider. The track is a native scroll-snap container,
// so touch swipes and trackpad gestures behave like the platform; arrows, dots
// and the arrow keys scroll it programmatically. Autoplay is driven by the
// active dot's progress animation (its animationend advances the slide), so
// pausing on hover, touch or keyboard focus just pauses that animation, and
// hidden tabs pause on their own. The parent owns `active` so the hero copy
// can follow the slide.
export default function HeroCarousel({ banners, active, onActiveChange, altFor }) {
  const { t } = useTranslation()
  const trackRef = useRef(null)
  // Slide a programmatic scroll is heading to; the slides it passes on the
  // way must not become active.
  const targetRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const [touching, setTouching] = useState(false)
  const [focused, setFocused] = useState(false)
  const [reducedMotion] = useState(prefersReducedMotion)
  const count = banners.length
  const autoplay = count > 1 && !reducedMotion
  const paused = hovered || touching || focused

  // Keep the track on the active slide when it changes from outside, e.g. the
  // banner list refreshed with fewer slides.
  useEffect(() => {
    const track = trackRef.current
    const width = track?.clientWidth
    if (!width || targetRef.current !== null) return
    if (Math.round(track.scrollLeft / width) !== active) {
      track.scrollTo({ left: active * width, behavior: 'instant' })
    }
  }, [active, count])

  function goTo(index) {
    const track = trackRef.current
    if (!track || count < 2) return
    const next = (index + count) % count
    targetRef.current = next
    track.scrollTo({ left: next * track.clientWidth, behavior: reducedMotion ? 'instant' : 'smooth' })
    onActiveChange(next)
  }

  function handleScroll() {
    const track = trackRef.current
    const width = track.clientWidth
    if (!width) return
    if (targetRef.current !== null) {
      if (Math.abs(track.scrollLeft - targetRef.current * width) > 2) return
      targetRef.current = null
    }
    const index = Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / width)))
    if (index !== active) onActiveChange(index)
  }

  // A swipe or trackpad gesture takes over from an arrow/dot scroll.
  function releaseTarget() {
    targetRef.current = null
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      goTo(active + (event.key === 'ArrowRight' ? 1 : -1))
    }
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={t('home.banner')}
      className="hero-carousel relative"
      onKeyDown={handleKeyDown}
      onPointerEnter={(event) => event.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={(event) => event.pointerType === 'mouse' && setHovered(false)}
      onFocus={(event) => setFocused(event.target.matches(':focus-visible'))}
      onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setFocused(false)}
    >
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={handleScroll}
          onTouchStart={() => { releaseTarget(); setTouching(true) }}
          onTouchEnd={() => setTouching(false)}
          onTouchCancel={() => setTouching(false)}
          onWheel={releaseTarget}
          className="hero-carousel-track flex snap-x snap-mandatory overflow-x-auto rounded-[1.75rem] shadow-realistic-lg"
        >
          {banners.map((banner, index) => {
            const current = index === active
            return (
              <div
                key={banner.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} / ${count}`}
                aria-hidden={!current}
                className="w-full shrink-0 snap-center snap-always"
              >
                <SmartLink
                  to={banner.link || '/products'}
                  tabIndex={current ? 0 : -1}
                  draggable={false}
                  className="block aspect-[4/3] bg-white/5"
                >
                  <img
                    src={banner.image}
                    alt={altFor(banner)}
                    draggable={false}
                    decoding="async"
                    fetchPriority={index === 0 ? 'high' : 'low'}
                    className="h-full w-full object-cover"
                  />
                </SmartLink>
              </div>
            )
          })}
        </div>

        {count > 1 && (
          <>
            <button type="button" onClick={() => goTo(active - 1)} aria-label={t('home.bannerPrev')} className="hero-carousel-arrow left-3 sm:left-4">
              <FaChevronLeft size={13} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => goTo(active + 1)} aria-label={t('home.bannerNext')} className="hero-carousel-arrow right-3 sm:right-4">
              <FaChevronRight size={13} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="-mx-1 flex items-center">
            {banners.map((banner, index) => {
              const current = index === active
              return (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`${t('home.banner')} ${index + 1}`}
                  aria-current={current}
                  className={`hero-dot ${current ? 'is-active' : ''}`}
                >
                  <span className="hero-dot-pill">
                    {current && (
                      <span
                        className={`hero-dot-fill ${autoplay ? 'is-playing' : ''}`}
                        style={autoplay ? { animationDuration: `${AUTOPLAY_MS}ms`, animationPlayState: paused ? 'paused' : 'running' } : undefined}
                        onAnimationEnd={autoplay ? () => goTo(active + 1) : undefined}
                      />
                    )}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="spec-strip font-mono-tabular text-white/40" aria-hidden="true">
            <span className="text-white">{pad(active + 1)}</span> / {pad(count)}
          </div>
        </div>
      )}
    </div>
  )
}
