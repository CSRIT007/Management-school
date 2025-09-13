import { useState } from 'react'
import { post } from '../../lib/api.js'

export default function StudentRegister() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', dob: '', emergency: '', program: '' })
  const submit = async (e) => {
    e.preventDefault()
    await post('/api/students', {
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      dob: form.dob,
      emergency: form.emergency,
      program: form.program,
    })
    setForm({ name: '', email: '', phone: '', address: '', dob: '', emergency: '', program: '' })
    alert('Student registered!')
  }
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-[#4361ee]">Student Register</h2>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700">Student ID</label>
          <input className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 bg-gray-50" placeholder="Auto-generated" disabled />
        </div>
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="mt-1 w-full rounded-xl border border-gray-200 p-2.5" placeholder="Jane Doe" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} className="mt-1 w-full rounded-xl border border-gray-200 p-2.5" placeholder="jane@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone Number</label>
          <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} className="mt-1 w-full rounded-xl border border-gray-200 p-2.5" placeholder="+855…" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <input value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} className="mt-1 w-full rounded-xl border border-gray-200 p-2.5" placeholder="Street, City" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
          <input type="date" value={form.dob} onChange={e=>setForm(f=>({...f,dob:e.target.value}))} className="mt-1 w-full rounded-xl border border-gray-200 p-2.5" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Emergency Contact</label>
          <input value={form.emergency} onChange={e=>setForm(f=>({...f,emergency:e.target.value}))} className="mt-1 w-full rounded-xl border border-gray-200 p-2.5" placeholder="Name & Phone" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Program/Course</label>
          <select value={form.program} onChange={e=>setForm(f=>({...f,program:e.target.value}))} className="mt-1 w-full rounded-xl border border-gray-200 p-2.5 bg-white">
            <option value="">Choose program</option>
            <option>Computer Science</option>
            <option>Business Administration</option>
            <option>Design</option>
          </select>
        </div>

        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
          <button type="button" onClick={()=>setForm({ name: '', email: '', phone: '', address: '', dob: '', emergency: '', program: '' })} className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded-xl text-white" style={{ backgroundColor: '#4361ee' }}>Submit</button>
        </div>
      </form>
    </div>
  )
}
