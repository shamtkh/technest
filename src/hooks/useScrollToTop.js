import { useLayoutEffect } from 'react'

// Jump to the top of the page, before paint, whenever `key` changes. Used
// for route changes and for in-page view swaps (e.g. the checkout form
// turning into the success screen) where a much shorter view would
// otherwise leave the window scrolled down to the footer. `instant`
// overrides the smooth `scroll-behavior` set on <html> in index.css.
export function useScrollToTop(key) {
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [key])
}
