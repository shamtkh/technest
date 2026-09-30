export const ORDER_STEPS = ['pending', 'accepted', 'transit', 'delivered']
export const ORDER_STEP_LABEL_KEYS = ['statusPending', 'statusAccepted', 'statusTransit', 'statusDelivered']
// Older orders used these statuses before the four-step flow.
const LEGACY = { new: 'pending', processing: 'accepted' }

export function orderStepIndex(status) {
  return Math.max(0, ORDER_STEPS.indexOf(LEGACY[status] || status))
}

export function orderStatus(status) {
  return ORDER_STEPS[orderStepIndex(status)]
}

export function orderStatusLabel(t, status) {
  return t(`admin.${ORDER_STEP_LABEL_KEYS[orderStepIndex(status)]}`)
}
