import { formatDisplayDate, inDateRange } from '../dateFormat.js'
import { formatInvNo } from '../invoiceId.js'
import { downloadCsv, reportFilename } from '../exportCsv.js'
import { SCHOOL_NAME } from '../schoolBrand.js'

export const POS_REVENUE_REPORT_TITLE = 'POS Revenue Report'

export const POS_REVENUE_EXPORT_COLUMNS = [
  { key: 'invoiceNo', label: 'INV No', getValue: (r) => formatInvNo(r.id) },
  { key: 'date', label: 'Date', getValue: (r) => formatDisplayDate(r.date) },
  { key: 'customer', label: 'Customer', getValue: (r) => r.customer || '' },
  { key: 'paymentMethod', label: 'Payment Method', getValue: (r) => r.paymentMethod || '' },
  { key: 'items', label: 'Items', getValue: (r) => formatItems(r.items) },
  { key: 'total', label: 'Total', getValue: (r) => Number(r.total || 0).toFixed(2) },
]

export const POS_REVENUE_FILTER_INITIAL = {
  paymentMethod: 'all',
  dateFrom: '',
  dateTo: '',
}

function formatItems(items = []) {
  if (!items.length) return ''
  return items.map((i) => `${i.name || 'Item'} ×${i.qty || 0}`).join('; ')
}

export function filterPosOrders(orders, filters) {
  return orders.filter((order) => {
    if (filters.paymentMethod !== 'all' && order.paymentMethod !== filters.paymentMethod) return false
    if (!inDateRange(order.date, filters.dateFrom, filters.dateTo)) return false
    return true
  })
}

export function downloadPosRevenueCsv({ columns, rows, reportTitle = POS_REVENUE_REPORT_TITLE }) {
  downloadCsv(reportFilename(reportTitle), columns, rows, {
    schoolName: SCHOOL_NAME,
    reportTitle,
  })
}
