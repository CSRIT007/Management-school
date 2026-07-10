export const PAYMENT_PURPOSE_OPTIONS = [
  { value: '', label: 'Select payment purpose' },
  { value: 'Tuition Fee', label: 'Tuition Fee — monthly or term school fees' },
  { value: 'Registration Fee', label: 'Registration Fee — new student enrollment' },
  { value: 'Book & Materials', label: 'Book & Materials — textbooks and supplies' },
  { value: 'Exam Fee', label: 'Exam Fee — examination and assessment' },
  { value: 'Uniform Fee', label: 'Uniform Fee — school uniform' },
  { value: 'Activity Fee', label: 'Activity Fee — events and extracurricular' },
  { value: 'Other', label: 'Other — miscellaneous payment' },
]

export function formatPaymentPurpose(purpose) {
  if (!purpose?.trim()) return 'School fee payment'
  const match = PAYMENT_PURPOSE_OPTIONS.find((o) => o.value === purpose)
  return match?.label || purpose
}

export function getInvoiceLines(invoice) {
  if (invoice?.items?.length) {
    return invoice.items.map((item) => {
      const qty = Number(item.qty) || 1
      const unitPrice = Number(item.price) || 0
      return {
        description: item.name || 'Product',
        qty,
        unitPrice,
        amount: unitPrice * qty,
      }
    })
  }
  const amount = Number(invoice?.amount) || 0
  return [{
    description: formatPaymentPurpose(invoice?.purpose),
    qty: 1,
    unitPrice: amount,
    amount,
  }]
}
