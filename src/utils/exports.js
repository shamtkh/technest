import { downloadCsv, todayStamp } from './csv'

// One row per variant. The same file is the bulk-stock import template:
// edit the "stock" column in Excel and upload it back.
export function exportProductsCsv(products) {
  const headers = ['productId', 'name', 'brand', 'category', 'price', 'storage', 'color', 'stock']
  const rows = products.flatMap((product) => (product.variants?.length ? product.variants : [{ storage: '', color: '', stock: product.stock }])
    .map((variant) => [product.id, product.name, product.brand, product.category, product.price, variant.storage, variant.color, variant.stock]))
  downloadCsv(`technest-products-${todayStamp()}.csv`, headers, rows)
}

export function exportOrdersCsv(orders) {
  const headers = ['id', 'createdAt', 'status', 'customer', 'phone', 'city', 'address', 'items', 'subtotal', 'discount', 'promoCode', 'total', 'guest']
  const rows = orders.map((order) => [
    order.id,
    order.createdAt,
    order.status,
    order.contact?.fullName || '',
    order.contact?.phone || '',
    order.contact?.city || '',
    order.contact?.address || '',
    (order.items || []).map((item) => `${item.name}${item.storage ? ` ${item.storage}` : ''}${item.color ? ` ${item.color}` : ''} ×${item.qty}`).join('; '),
    order.subtotal ?? order.total,
    order.discount || 0,
    order.promoCode || '',
    order.total,
    order.guest ? 'yes' : '',
  ])
  downloadCsv(`technest-orders-${todayStamp()}.csv`, headers, rows)
}
