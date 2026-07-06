export default function PaymentNoteField({ value, onChange }) {
  return (
    <div>
      <label className="label">Note</label>
      <input
        type="text"
        className="input"
        placeholder="e.g. paid in full, partial payment, receipt requested"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={200}
      />
    </div>
  )
}
