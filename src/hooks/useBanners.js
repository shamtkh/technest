import { useEffect, useState } from 'react'
import api from '../api/api'

// Active hero banners, or null until known. The last list is kept in
// localStorage so a reload paints the admin's banners straight away instead
// of flashing the default hero while the API answers; it's refreshed in the
// background on every visit. Only text and image URLs are stored: the images
// themselves are long-cached by the browser (GET /banners/:id/image).
const CACHE_KEY = 'technest_banners'

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY))
    return Array.isArray(cached) ? cached : null
  } catch {
    return null
  }
}

function writeCache(banners) {
  try {
    // An older API inlines base64 images; those would eat the storage quota
    // redux-persist needs, so they're not cached.
    if (banners.some((banner) => banner.image.startsWith('data:'))) localStorage.removeItem(CACHE_KEY)
    else localStorage.setItem(CACHE_KEY, JSON.stringify(banners))
  } catch {
    // Storage full or blocked: the banners just load from the API next time.
  }
}

let latest = readCache()
let inFlight = null

function loadBanners() {
  inFlight ??= api.getBanners()
    .then((data) => {
      latest = data.filter((banner) => banner.active !== false && banner.image)
      writeCache(latest)
      return latest
    })
    .finally(() => { inFlight = null })
  return inFlight
}

export function useBanners() {
  const [banners, setBanners] = useState(latest)

  useEffect(() => {
    let cancelled = false
    loadBanners()
      .then((data) => { if (!cancelled) setBanners(data) })
      // Offline or API down: keep cached banners, else fall back to the default hero.
      .catch(() => { if (!cancelled) setBanners((current) => current ?? []) })
    return () => { cancelled = true }
  }, [])

  return banners
}
