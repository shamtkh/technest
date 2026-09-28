import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// Segmented tab bar: an ink pill slides under the active tab. Everything stays
// on one row — on phones it scrolls sideways, with faded edges hinting at the
// tabs that are off screen, instead of wrapping onto several lines.
export default function AdminTabs({ tabs, active, onChange, label }) {
  const listRef = useRef(null)
  const [pill, setPill] = useState(null)
  const [edges, setEdges] = useState({ start: false, end: false })
  // Tab widths change with the language and badges.
  const layoutKey = tabs.map((tab) => `${tab.key}:${tab.label}:${tab.badge}`).join('|')

  function updateEdges() {
    const list = listRef.current
    if (!list) return
    const start = list.scrollLeft > 2
    const end = list.scrollLeft + list.clientWidth < list.scrollWidth - 2
    setEdges((current) => (current.start === start && current.end === end ? current : { start, end }))
  }

  useLayoutEffect(() => {
    const list = listRef.current
    const measure = () => {
      const button = list.querySelector(`[data-tab="${active}"]`)
      if (button) setPill({ left: button.offsetLeft, width: button.offsetWidth })
      updateEdges()
    }
    measure()
    // Web fonts finishing loading and viewport changes resize the tabs.
    const observer = new ResizeObserver(measure)
    list.querySelectorAll('[data-tab]').forEach((button) => observer.observe(button))
    observer.observe(list)
    return () => observer.disconnect()
  }, [active, layoutKey])

  // Bring the active tab into view (horizontally only, so the page stays put).
  useEffect(() => {
    const list = listRef.current
    const button = list?.querySelector(`[data-tab="${active}"]`)
    if (!button || list.scrollWidth <= list.clientWidth) return
    list.scrollTo({ left: button.offsetLeft - (list.clientWidth - button.offsetWidth) / 2, behavior: 'smooth' })
  }, [active])

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onScroll={updateEdges}
      className={`admin-tabs ${edges.start ? 'fade-start' : ''} ${edges.end ? 'fade-end' : ''}`}
    >
      {pill && <span className="admin-tabs-pill" style={{ transform: `translateX(${pill.left}px)`, width: pill.width }} aria-hidden="true" />}
      {tabs.map((tab) => {
        const Icon = tab.icon
        const selected = tab.key === active
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            data-tab={tab.key}
            aria-selected={selected}
            onClick={() => onChange(tab.key)}
            className={`admin-tab ${selected ? 'is-active' : ''}`}
          >
            <Icon className="admin-tab-icon" aria-hidden="true" />
            {tab.label}
            {tab.badge > 0 && <span className="admin-tab-badge">{tab.badge > 99 ? '99+' : tab.badge}</span>}
          </button>
        )
      })}
    </div>
  )
}
