import { useEffect } from 'react'

// Shared page scroll lock for modals, sheets and the mobile menu. Locks both
// <html> and <body> (mobile browsers scroll the root element, so body alone
// isn't enough), counts nested locks, and pads for the desktop scrollbar so
// the page doesn't shift sideways.
let activeLocks = 0
let saved = null

function lock() {
  if (activeLocks++ > 0) return
  const { documentElement: html, body } = document
  const scrollbarWidth = window.innerWidth - html.clientWidth
  saved = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    bodyPaddingRight: body.style.paddingRight,
  }
  html.style.overflow = 'hidden'
  body.style.overflow = 'hidden'
  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`
}

function unlock() {
  if (--activeLocks > 0 || !saved) return
  const { documentElement: html, body } = document
  html.style.overflow = saved.htmlOverflow
  body.style.overflow = saved.bodyOverflow
  body.style.paddingRight = saved.bodyPaddingRight
  saved = null
}

export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined
    lock()
    return unlock
  }, [active])
}
