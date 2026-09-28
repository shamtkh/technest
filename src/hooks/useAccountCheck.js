import { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import api, { SESSION_ENDED_EVENT } from '../api/api'
import { logout } from '../store/slices/authSlice'
import { useToast } from './useToast'
import { usePolling } from './usePolling'

const CHECK_INTERVAL_MS = 60000

// The signed-in user lives in persisted client state, so it can outlive its
// session: the admin deleted the account, the password was changed on
// another device, or the token expired (or predates tokens). Sign out as soon
// as any request is rejected for that reason, and check on load, when the tab
// comes back and every minute. Network errors are ignored.
export function useAccountCheck() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { showToast } = useToast()
  const userId = useSelector((state) => state.auth.user?.id)
  const hasToken = useSelector((state) => Boolean(state.auth.user?.token))

  const endSession = useCallback((reason) => {
    dispatch(logout())
    showToast(t(reason === 'ACCOUNT_DELETED' ? 'auth.accountDeleted' : 'auth.sessionExpired'), 'warning', 6000)
  }, [dispatch, showToast, t])

  const check = useCallback(() => {
    if (userId == null) return
    api.getUser(userId).catch((err) => {
      // With a token, a rejected session already fired SESSION_ENDED_EVENT.
      // Sessions from before tokens existed have none and land here.
      if (!hasToken && err.message === 'AUTH_REQUIRED') endSession('AUTH_REQUIRED')
    })
  }, [userId, hasToken, endSession])

  useEffect(check, [check])
  usePolling(check, CHECK_INTERVAL_MS, userId != null)

  useEffect(() => {
    if (userId == null) return undefined
    const onSessionEnded = (event) => endSession(event.detail)
    window.addEventListener(SESSION_ENDED_EVENT, onSessionEnded)
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onSessionEnded)
  }, [userId, endSession])
}
