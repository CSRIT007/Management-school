import Badge from './ui/Badge.jsx'
import Button from './ui/Button.jsx'
import { getInvoiceLines } from '../lib/paymentPurpose.js'
import { formatDisplayDate } from '../lib/dateFormat.js'
import { getBillToParts, formatInvoiceDateTime } from '../lib/invoiceFormat.js'

const INVOICE_CONTACT = {
  website: 'www.schoolmanagement.com',
  email: 'email@schoolmanagement.com',
  location: 'Phnom Penh, Cambodia',
  phone: 'Phone: +855 12 345 6789',
}

function InvoiceContactFooter({ className = '' }) {
  return (
    <div className={`border-t border-slate-200 pt-4 text-xs text-slate-600 ${className}`}>
      <div className="flex items-stretch justify-center gap-4">
        <div className="space-y-1 text-right leading-relaxed">
          <p>{INVOICE_CONTACT.website}</p>
          <p>{INVOICE_CONTACT.email}</p>
        </div>
        <div className="flex shrink-0 items-center self-stretch text-base text-slate-300" aria-hidden="true">
          |
        </div>
        <div className="space-y-1 text-left leading-relaxed">
          <p>{INVOICE_CONTACT.location}</p>
          <p>{INVOICE_CONTACT.phone}</p>
        </div>
      </div>
    </div>
  )
}

function contactFooterHtml() {
  return `
    <div class="contact-footer">
      <div class="contact-row">
        <div class="contact-col contact-left">
          <div>${INVOICE_CONTACT.website}</div>
          <div>${INVOICE_CONTACT.email}</div>
        </div>
        <div class="contact-sep">|</div>
        <div class="contact-col contact-right">
          <div>${INVOICE_CONTACT.location}</div>
          <div>${INVOICE_CONTACT.phone}</div>
        </div>
      </div>
    </div>`
}

function formatMoney(amount) {
  return `$${Number(amount || 0).toFixed(2)}`
}

function formatDate(date) {
  return formatDisplayDate(date)
}

export default function InvoiceDocument({ invoice, compact = false, showActions = false, onPrint, onClose }) {
  if (!invoice) return null

  const amount = Number(invoice.amount) || 0
  const lineRows = getInvoiceLines(invoice)
  const { name: billToName, studentId: billToStudentId } = getBillToParts(invoice)
  const invoicedBy = invoice.invoicedBy?.trim() || 'Admin'
  const invoicedAt = formatInvoiceDateTime(invoice.invoicedAt)
  const userNote = invoice.note?.trim()

  return (
    <div
      className={[
        'invoice-document flex min-h-[32rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm dark:border-slate-700 dark:bg-white dark:text-slate-800',
        compact ? 'text-sm' : '',
      ].join(' ')}
    >
      {/* Header band */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 px-6 py-5 text-white sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-lg font-bold backdrop-blur">
                MS
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Management School</h2>
                <p className="text-xs text-indigo-100">School Admin Portal</p>
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-medium uppercase tracking-widest text-indigo-200">Invoice</p>
            <p className="mt-1 text-xl font-bold">{invoice.id || '—'}</p>
            <p className="mt-1 text-sm text-indigo-100">{formatDate(invoice.date)}</p>
          </div>
        </div>
      </div>

      <div className={`flex-1 space-y-6 ${compact ? 'p-5' : 'p-6 sm:p-8'}`}>
        {/* Bill to + meta */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Bill To</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{billToName}</p>
            {billToStudentId ? (
              <p className="mt-0.5 font-mono text-sm text-slate-500">({billToStudentId})</p>
            ) : null}
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Payment Details</p>
            <div className="mt-2 space-y-1 text-sm">
              <p><span className="text-slate-500">Method:</span> <span className="font-medium">{invoice.method || '—'}</span></p>
              <p className="flex items-center gap-2 sm:justify-end">
                <span className="text-slate-500">Status:</span>
                <Badge status={invoice.status}>{invoice.status}</Badge>
              </p>
              <div className="pt-2 sm:text-right">
                <p className="text-slate-500">Invoiced by</p>
                <p className="font-medium text-slate-900">{invoicedBy}</p>
                <p className="text-xs text-slate-500">{invoicedAt}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold text-right">Qty</th>
                <th className="px-4 py-3 font-semibold text-right">Unit Price</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineRows.map((row, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-900">{row.description}</p>
                  </td>
                  <td className="px-4 py-4 text-right text-slate-600">{row.qty}</td>
                  <td className="px-4 py-4 text-right text-slate-600">{formatMoney(row.unitPrice)}</td>
                  <td className="px-4 py-4 text-right font-semibold text-slate-900">{formatMoney(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatMoney(amount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-indigo-700">
              <span>Total Due</span>
              <span>{formatMoney(amount)}</span>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
          {userNote ? (
            <p><span className="font-medium text-slate-600">Note:</span> {userNote}</p>
          ) : null}
          <p className={userNote ? 'mt-2' : ''}>
            Thank you for your payment. Please retain this invoice for your records.
            For questions, contact the school administration office.
          </p>
        </div>

        {showActions && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 print:hidden">
            {onClose && (
              <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
            )}
            {onPrint && (
              <Button type="button" onClick={onPrint}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M5.25 5.25a3 3 0 013-3h3.763a3 3 0 013 3.763V19.5a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25V5.25zm3.75 0V9a3 3 0 003 3h3.75a3 3 0 003-3V5.25H9z" clipRule="evenodd" />
                </svg>
                Print Invoice
              </Button>
            )}
          </div>
        )}
      </div>

      <InvoiceContactFooter className={`mt-auto shrink-0 ${compact ? 'px-5 pb-5' : 'px-6 pb-6 sm:px-8 sm:pb-8'}`} />
    </div>
  )
}

export function printInvoice(invoice) {
  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) return

  const amount = Number(invoice.amount) || 0
  const lineRows = getInvoiceLines(invoice)
  const { name: billToName, studentId: billToStudentId } = getBillToParts(invoice)
  const invoicedBy = (invoice.invoicedBy?.trim() || 'Admin').replace(/</g, '&lt;').replace(/&/g, '&amp;')
  const invoicedAt = formatInvoiceDateTime(invoice.invoicedAt).replace(/</g, '&lt;').replace(/&/g, '&amp;')
  const userNote = invoice.note?.trim()
  const fmt = (n) => `$${n.toFixed(2)}`
  const date = formatDate(invoice.date)
  const billToNameHtml = billToName.replace(/</g, '&lt;').replace(/&/g, '&amp;')
  const billToIdHtml = billToStudentId.replace(/</g, '&lt;').replace(/&/g, '&amp;')
  const lineRowsHtml = lineRows.map((row) => {
    const desc = row.description.replace(/</g, '&lt;').replace(/&/g, '&amp;')
    return `<tr>
          <td><strong>${desc}</strong></td>
          <td class="right">${row.qty}</td>
          <td class="right">${fmt(row.unitPrice)}</td>
          <td class="right"><strong>${fmt(row.amount)}</strong></td>
        </tr>`
  }).join('')

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${invoice.id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; }
    .page { min-height: 100vh; display: flex; flex-direction: column; padding: 32px; }
    .invoice-main { flex: 1; }
    .header { background: linear-gradient(135deg, #4f46e5, #6d28d9); color: white; padding: 24px 32px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: flex-start; }
    .brand { display: flex; gap: 12px; align-items: center; }
    .logo { width: 44px; height: 44px; background: rgba(255,255,255,0.15); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; }
    .body { border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; padding: 32px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px; }
    th { background: #f8fafc; text-align: left; padding: 12px 16px; font-size: 11px; text-transform: uppercase; color: #64748b; border: 1px solid #e2e8f0; }
    td { padding: 16px; border: 1px solid #e2e8f0; }
    .right { text-align: right; }
    .totals { margin-left: auto; width: 280px; font-size: 14px; }
    .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
    .total-row { border-top: 2px solid #e2e8f0; padding-top: 12px !important; font-size: 18px; font-weight: bold; color: #4338ca; }
    .note { background: #f8fafc; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #64748b; margin-top: 24px; }
    .contact-footer { border-top: 1px solid #e2e8f0; margin-top: auto; padding-top: 16px; font-size: 11px; color: #475569; }
    .contact-row { display: flex; align-items: stretch; justify-content: center; gap: 16px; }
    .contact-col { line-height: 1.7; }
    .contact-col div + div { margin-top: 2px; }
    .contact-left { text-align: right; }
    .contact-right { text-align: left; }
    .contact-sep { display: flex; align-items: center; align-self: stretch; color: #cbd5e1; font-size: 18px; padding: 0 4px; }
    .status { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; background: #ecfdf5; color: #047857; }
    @media print {
      .page { min-height: 100vh; padding: 0.5in; }
      .contact-footer { position: fixed; bottom: 0.5in; left: 0.5in; right: 0.5in; background: white; }
    }
  </style>
</head>
<body>
  <div class="page">
  <div class="invoice-main">
  <div class="header">
    <div class="brand">
      <div class="logo">MS</div>
      <div>
        <h1 style="font-size: 18px;">Management School</h1>
        <p style="font-size: 12px; opacity: 0.85;">School Admin Portal</p>
      </div>
    </div>
    <div style="text-align: right;">
      <p style="font-size: 11px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.1em;">Invoice</p>
      <p style="font-size: 22px; font-weight: bold; margin-top: 4px;">${invoice.id}</p>
      <p style="font-size: 13px; opacity: 0.9; margin-top: 4px;">${date}</p>
    </div>
  </div>
  <div class="body">
    <div class="grid">
      <div>
        <p class="label">Bill To</p>
        <p style="font-weight: 600; margin-top: 8px; font-size: 16px;">${billToNameHtml}</p>
        ${billToIdHtml ? `<p style="font-family: ui-monospace, monospace; font-size: 13px; color: #64748b; margin-top: 2px;">(${billToIdHtml})</p>` : ''}
      </div>
      <div style="text-align: right;">
        <p class="label">Payment Details</p>
        <p style="margin-top: 8px;">Method: <strong>${invoice.method || '—'}</strong></p>
        <p style="margin-top: 4px;">Status: <span class="status">${invoice.status || '—'}</span></p>
        <div style="margin-top: 12px;">
          <p style="color: #64748b;">Invoiced by</p>
          <p style="font-weight: 600; margin-top: 2px;">${invoicedBy}</p>
          <p style="font-size: 12px; color: #64748b; margin-top: 2px;">${invoicedAt}</p>
        </div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="right">Qty</th>
          <th class="right">Unit Price</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineRowsHtml}
      </tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal</span><span>${fmt(amount)}</span></div>
      <div><span>Tax</span><span>$0.00</span></div>
      <div class="total-row"><span>Total Due</span><span>${fmt(amount)}</span></div>
    </div>
    <div class="note">
      ${userNote ? `<p><strong>Note:</strong> ${userNote.replace(/</g, '&lt;')}</p>` : ''}
      <p${userNote ? ' style="margin-top: 8px;"' : ''}>
        Thank you for your payment. Please retain this invoice for your records.
        For questions, contact the school administration office.
      </p>
    </div>
  </div>
  </div>
  ${contactFooterHtml()}
  </div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`)
  win.document.close()
}
