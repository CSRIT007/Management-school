export const INVOICE_PREFIX = 'INV'

export function parseInvoiceNumber(id) {
  const match = /^INV-(\d+)$/i.exec(String(id || '').trim())
  return match ? Number(match[1]) : 0
}

export function formatInvNo(id) {
  if (!id) return '—'
  return /^INV-\d+$/i.test(id) ? id.toUpperCase() : '—'
}

export function sortInvoicesNewestFirst(items = []) {
  return [...items].sort((a, b) => {
    const byNumber = parseInvoiceNumber(b.id) - parseInvoiceNumber(a.id)
    if (byNumber !== 0) return byNumber
    const byDate = new Date(b.date || 0) - new Date(a.date || 0)
    if (byDate !== 0) return byDate
    return new Date(b.invoicedAt || 0) - new Date(a.invoicedAt || 0)
  })
}
