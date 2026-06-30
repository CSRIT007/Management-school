import { useState } from 'react'
import { post } from '../../lib/api.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'

export default function StudentRegister() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', dob: '', emergency: '', program: '' })

  const reset = () => setForm({ name: '', email: '', phone: '', address: '', dob: '', emergency: '', program: '' })

  const submit = async (e) => {
    e.preventDefault()
    await post('/api/students', form)
    reset()
    alert('Student registered!')
  }

  return (
    <div>
      <PageHeader
        title="Student Register"
        subtitle="Enroll a new student into the management system"
      />

      <form onSubmit={submit} className="panel p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="label">Student ID</label>
            <input className="input" placeholder="Auto-generated" disabled />
          </div>
          <div>
            <label className="label">Full Name</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" placeholder="Jane Doe" />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input" placeholder="jane@example.com" />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input" placeholder="+855…" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Address</label>
            <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="input" placeholder="Street, City" />
          </div>
          <div>
            <label className="label">Date of Birth</label>
            <input type="date" value={form.dob} onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Emergency Contact</label>
            <input value={form.emergency} onChange={(e) => setForm((f) => ({ ...f, emergency: e.target.value }))} className="input" placeholder="Name & Phone" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Program / Course</label>
            <select value={form.program} onChange={(e) => setForm((f) => ({ ...f, program: e.target.value }))} className="input">
              <option value="">Choose program</option>
              <option>Computer Science</option>
              <option>Business Administration</option>
              <option>Design</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
          <Button type="button" variant="secondary" onClick={reset}>Cancel</Button>
          <Button type="submit">Register Student</Button>
        </div>
      </form>
    </div>
  )
}
