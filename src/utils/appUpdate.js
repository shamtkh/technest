// Installed PWAs and mobile tabs resume from memory instead of reloading, so after a
// deploy they can keep running the old build for days. When the page comes back after
// a while in the background, check whether a newer build is live and reload onto it
// (and let the service worker check for its own update at the same time).

const AWAY_BEFORE_CHECK = 5 * 60 * 1000
const ENTRY_SCRIPT = /\/assets\/index-[\w-]+\.js/
// Reloading would wipe a half-filled form; these pages pick the update up next time.
const NO_RELOAD = /^\/(checkout|admin)(\/|$)/

function runningEntry() {
  const script = document.querySelector('script[type="module"][src*="/assets/index-"]')
  return script?.getAttribute('src').match(ENTRY_SCRIPT)?.[0]
}

async function newBuildIsLive() {
  const running = runningEntry()
  if (!running) return false
  const response = await fetch('/', { cache: 'no-store' })
  if (!response.ok) return false
  const deployed = (await response.text()).match(ENTRY_SCRIPT)?.[0]
  return Boolean(deployed) && deployed !== running
}

export function watchForAppUpdates() {
  let hiddenAt = 0
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now()
      return
    }
    if (!hiddenAt || Date.now() - hiddenAt < AWAY_BEFORE_CHECK) return
    hiddenAt = 0

    navigator.serviceWorker?.getRegistration().then((registration) => registration?.update()).catch(() => {})
    if (NO_RELOAD.test(window.location.pathname)) return
    newBuildIsLive()
      .then((isNew) => { if (isNew) window.location.reload() })
      .catch(() => {})
  })
}
