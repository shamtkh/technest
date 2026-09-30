// Lets other parts of the UI (e.g. the mobile menu) open the floating support widget.
export const OPEN_SUPPORT_EVENT = 'technest:open-support'

export function openSupport() {
  window.dispatchEvent(new Event(OPEN_SUPPORT_EVENT))
}
