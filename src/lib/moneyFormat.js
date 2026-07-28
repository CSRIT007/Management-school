/**
 * Display dollars with thousand separators, e.g. $1,500.00
 */
export function formatMoney(n) {
  const v = Number(n)
  const num = Number.isFinite(v) ? v : 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Plain amount with commas for exports (no $), e.g. 1,500.00
 */
export function formatMoneyAmount(n) {
  const v = Number(n)
  const num = Number.isFinite(v) ? v : 0
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}
