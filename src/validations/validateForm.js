export const rules = {
  required: (value) => (value && String(value).trim() ? '' : 'required'),
  email: (value) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '') ? '' : 'invalidEmail'),
  minLength: (min) => (value) =>
    value && String(value).length >= min ? '' : `minLength:${min}`,
  phone: (value) => (/^\+?[0-9]{9,13}$/.test((value || '').replace(/[\s-]/g, '')) ? '' : 'invalidPhone'),
  match: (otherValue) => (value) => (value === otherValue ? '' : 'noMatch'),
}

/**
 * validateForm(values, schema)
 * schema: { field: [validatorFn, validatorFn, ...] }
 * returns: { field: 'errorCode' } for only the failing fields
 */
export function validateForm(values, schema) {
  const errors = {}
  for (const field of Object.keys(schema)) {
    for (const validator of schema[field]) {
      const result = validator(values[field])
      if (result) {
        errors[field] = result
        break
      }
    }
  }
  return errors
}

export function isValid(errors) {
  return Object.keys(errors).length === 0
}

/**
 * translateError(code, t)
 * Maps a raw error code from `rules` (e.g. 'required', 'minLength:6')
 * to a translated, human-readable message.
 */
export function translateError(code, t) {
  if (!code) return ''
  const [key, param] = code.split(':')
  return t(`validation.${key}`, param ? { min: param } : undefined)
}
