import { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import api from '../api/api'
import { logout } from '../store/slices/authSlice'
import { useToast } from './useToast'
import { usePolling } from './usePolling'

const CHECK_INTERVAL_MS = 60000

// The signed-in user lives only in persisted client state, so an account the
// admin deleted would stay "logged in" on its devices. Check that it still
// exists on load, when the tab comes back and every minute, and sign out if
// it's gone. Network errors are ignored: only a definite "not found" counts.
export function useAccountCheck() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { showToast } = useToast()
  const userId = useSelector((state) => state.auth.user?.id)

  const check = useCallback(() => {
    if (userId == null) return
    api.getUser(userId).catch((err) => {
      if (err.message !== 'USER_NOT_FOUND') return
      dispatch(logout())
      showToast(t('auth.accountDeleted'), 'warning', 6000)
    })
  }, [userId, dispatch, showToast, t])

  useEffect(check, [check])
  usePolling(check, CHECK_INTERVAL_MS, userId != null)
}
