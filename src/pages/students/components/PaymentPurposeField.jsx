import { PAYMENT_PURPOSE_OPTIONS } from '../../../lib/paymentPurpose.js'

export default function PaymentPurposeField({ value, onChange, required = true }) {
  return (
    <div>
      <label className="label">Payment Purpose</label>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        {PAYMENT_PURPOSE_OPTIONS.map((opt) => (
          <option key={opt.value || 'empty'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
