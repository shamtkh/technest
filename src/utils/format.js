export function formatPrice(value) {
  if (value === null || value === undefined) return ''
  return new Intl.NumberFormat('fr-FR').format(value).replace(/\u202f/g, ' ')
}
