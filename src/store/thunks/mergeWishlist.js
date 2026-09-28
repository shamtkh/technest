import api, { setAuthToken } from '../../api/api'

// Merge a guest's local wishlist into the account's saved one after sign-in,
// and persist the union so it shows up on the user's other devices too.
export async function mergeWishlist(user, localIds) {
  if (!user || user.role === 'admin') return user
  // The new session reaches the store only after this thunk resolves; the
  // wishlist save below already needs it.
  setAuthToken(user.token)
  const saved = Array.isArray(user.wishlist) ? user.wishlist.map(Number) : []
  const merged = [...new Set([...localIds, ...saved])]
  if (merged.length === saved.length) return { ...user, wishlist: merged }
  try {
    return { ...user, wishlist: await api.updateWishlist(user.id, merged) }
  } catch {
    return { ...user, wishlist: merged }
  }
}
