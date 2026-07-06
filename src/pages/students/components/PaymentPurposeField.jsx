const PURPOSE_OPTIONS = [
  { value: '', label: 'Select payment purpose' },
  { value: 'Tuition Fee', label: 'Tuition Fee — monthly or term school fees' },
  { value: 'Registration Fee', label: 'Registration Fee — new student enrollment' },
  { value: 'Book & Materials', label: 'Book & Materials — textbooks and supplies' },
  { value: 'Exam Fee', label: 'Exam Fee — examination and assessment' },
  { value: 'Uniform Fee', label: 'Uniform Fee — school uniform' },
  { value: 'Activity Fee', label: 'Activity Fee — events and extracurricular' },
  { value: 'Other', label: 'Other — miscellaneous payment' },
]

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
        {PURPOSE_OPTIONS.map((opt) => (
          <option key={opt.value || 'empty'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
