import { useEffect, useRef } from 'react'

// setInterval that pauses while the tab is hidden (background tab, locked
// phone) and refreshes once when it becomes visible again.
export function usePolling(callback, intervalMs, enabled = true) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return undefined
    let timer = null
    const start = () => {
      if (timer === null) timer = setInterval(() => callbackRef.current(), intervalMs)
    }
    const stop = () => {
      clearInterval(timer)
      timer = null
    }
    const onVisibilityChange = () => {
      if (document.hidden) {
        stop()
      } else {
        callbackRef.current()
        start()
      }
    }

    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [intervalMs, enabled])
}
