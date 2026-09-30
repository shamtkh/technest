// Up to two initials for an avatar: "Alisher Navoiy" → "AN".
export function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => [...word][0])
    .join('')
    .toUpperCase()
}

export function formatPrice(value) {
  if (value === null || value === undefined) return ''
  return new Intl.NumberFormat('fr-FR').format(value).replace(/\u202f/g, ' ')
}
