export function validateProductForm(form) {
  const errors = {}

  if (!form.name || !form.name.trim()) errors.name = 'required'
  if (!form.brand || !form.brand.trim()) errors.brand = 'required'
  if (!form.category) errors.category = 'required'
  if (!form.price || Number(form.price) <= 0) errors.price = 'invalidPrice'
  if (form.stock === '' || form.stock === undefined || Number(form.stock) < 0) errors.stock = 'invalidStock'

  return errors
}
