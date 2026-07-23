import { formatDisplayDate, inDateRange } from '../dateFormat.js'
import { formatInvNo } from '../invoiceId.js'
import { downloadCsvSections, reportFilename } from '../exportCsv.js'
import { SCHOOL_NAME } from '../schoolBrand.js'

export const STOCK_REPORT_TITLE = 'Stock Report'

export const STOCK_REPORT_SECTIONS = [
  { key: 'summary', label: 'Summary statistics', defaultSelected: true },
  { key: 'posSales', label: 'POS sales', defaultSelected: true },
  { key: 'lowStock', label: 'Low stock alert', defaultSelected: true },
  { key: 'salesTrend', label: 'Sales over time (daily)', defaultSelected: false },
  { key: 'topProducts', label: 'Top selling products', defaultSelected: true },
  { key: 'inventory', label: 'Full product inventory', defaultSelected: false },
]

export const STOCK_FILTER_INITIAL = {
  dateFrom: '',
  dateTo: '',
  paymentMethod: 'all',
}

function formatMoney(n) {
  return Number(n || 0).toFixed(2)
}

function formatItemsLine(items = []) {
  if (!items.length) return ''
  return items.map((i) => `${i.name} ×${i.qty}`).join(', ')
}

export function filterOrders(orders, filters) {
  return orders.filter((order) => {
    if (filters.paymentMethod !== 'all' && order.paymentMethod !== filters.paymentMethod) return false
    if (!inDateRange(order.date, filters.dateFrom, filters.dateTo)) return false
    return true
  })
}

export function buildStockReportSections({
  selectedKeys,
  filters,
  summary,
  orders,
  low,
  sales,
  top,
  products,
  unitsInStock,
  ordersToday,
}) {
  const sections = []
  const filteredOrders = filterOrders(orders, filters)

  if (selectedKeys.includes('summary')) {
    sections.push({
      title: 'SUMMARY',
      columns: [
        { key: 'metric', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ],
      rows: [
        { metric: 'Total Products', value: summary.totalProducts },
        { metric: 'Units in Stock', value: unitsInStock },
        { metric: 'Sales Today ($)', value: formatMoney(summary.totalSalesToday) },
        { metric: 'Orders Today', value: ordersToday },
        { metric: 'Low Stock Items', value: summary.lowStockItems },
        { metric: 'Report Date', value: formatDisplayDate(new Date()) },
      ],
    })
  }

  if (selectedKeys.includes('posSales')) {
    sections.push({
      title: 'POS SALES',
      columns: [
        { key: 'invoiceNo', label: 'INV No', getValue: (r) => formatInvNo(r.id) },
        { key: 'date', label: 'Date', getValue: (r) => formatDisplayDate(r.date) },
        { key: 'customer', label: 'Customer', getValue: (r) => r.customer || 'Walk-in' },
        { key: 'paymentMethod', label: 'Payment', getValue: (r) => r.paymentMethod || 'Cash' },
        { key: 'items', label: 'Items', getValue: (r) => formatItemsLine(r.items) },
        { key: 'total', label: 'Total ($)', getValue: (r) => formatMoney(r.total) },
      ],
      rows: [...filteredOrders].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    })
  }

  if (selectedKeys.includes('lowStock')) {
    sections.push({
      title: 'LOW STOCK ALERT',
      columns: [
        { key: 'name', label: 'Product' },
        { key: 'category', label: 'Category' },
        { key: 'sku', label: 'SKU' },
        { key: 'price', label: 'Price ($)', getValue: (r) => formatMoney(r.price) },
        { key: 'stock', label: 'Stock' },
      ],
      rows: low,
    })
  }

  if (selectedKeys.includes('salesTrend')) {
    sections.push({
      title: 'SALES OVER TIME',
      columns: [
        { key: 'date', label: 'Date', getValue: (r) => formatDisplayDate(r.date) },
        { key: 'total', label: 'Revenue ($)', getValue: (r) => formatMoney(r.total) },
      ],
      rows: [...sales].sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    })
  }

  if (selectedKeys.includes('topProducts')) {
    sections.push({
      title: 'TOP SELLING PRODUCTS',
      columns: [
        { key: 'name', label: 'Product' },
        { key: 'qty', label: 'Quantity Sold' },
      ],
      rows: top,
    })
  }

  if (selectedKeys.includes('inventory')) {
    sections.push({
      title: 'FULL INVENTORY',
      columns: [
        { key: 'id', label: 'Product ID' },
        { key: 'name', label: 'Name' },
        { key: 'category', label: 'Category' },
        { key: 'sku', label: 'SKU' },
        { key: 'stock', label: 'Stock' },
        { key: 'price', label: 'Price ($)', getValue: (r) => formatMoney(r.price) },
        { key: 'cost', label: 'Cost ($)', getValue: (r) => formatMoney(r.cost) },
      ],
      rows: products,
    })
  }

  return sections
}

export function downloadStockReportCsv({ selectedKeys, filters, reportTitle = STOCK_REPORT_TITLE, ...data }) {
  const sections = buildStockReportSections({ selectedKeys, filters, ...data })
  downloadCsvSections(reportFilename(reportTitle), sections, {
    schoolName: SCHOOL_NAME,
    reportTitle,
  })
}

export function countStockExportRows(selectedKeys, filters, data) {
  const sections = buildStockReportSections({ selectedKeys, filters, ...data })
  return sections.reduce((sum, section) => sum + (section.rows?.length || 0), 0)
}
