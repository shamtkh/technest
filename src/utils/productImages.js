function makeFallbackImage(name) {
  const safeName = String(name || 'Product').replace(/[<>&"']/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><rect width="1200" height="1200" fill="#f1eee8"/><rect x="90" y="90" width="1020" height="1020" rx="36" fill="#e4dfd5"/><text x="600" y="570" text-anchor="middle" font-family="Arial,sans-serif" font-size="52" font-weight="700" fill="#17202a">${safeName}</text><text x="600" y="650" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" fill="#5f6972">Image unavailable</text></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export function getProductImages(product) {
  const images = [...new Set((product?.images || []).filter(Boolean))]
  return images.length ? images : [makeFallbackImage(product?.name)]
}

export function getProductFallbackImage(product) {
  return makeFallbackImage(product?.name)
}