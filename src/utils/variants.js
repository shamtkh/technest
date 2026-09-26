// Pick a sensible variant for one-click add-to-cart actions (product cards,
// "bought together" bundles): the first one that is in stock.
export function firstAvailableVariant(product) {
  const variant = product.variants?.find((item) => Number(item.stock) > 0)
  if (variant) return { storage: variant.storage, color: variant.color, stock: Number(variant.stock) }
  return { storage: product.storage?.[0] || '', color: product.colors?.[0]?.name || '', stock: Number(product.stock) || 0 }
}
