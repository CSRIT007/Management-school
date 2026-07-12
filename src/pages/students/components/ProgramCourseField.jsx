import { useState } from 'react'
import Button from '../../../components/ui/Button.jsx'

export default function ProgramCourseField({ value, onChange, programs, onAdd }) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const cancelAdd = () => {
    setAdding(false)
    setNewName('')
    setError('')
  }

  const submitNew = async () => {
    const name = newName.trim()
    if (!name) {
      setError('Enter a program or course name.')
      return
    }

    const exists = programs.some((p) => p.toLowerCase() === name.toLowerCase())
    if (exists) {
      onChange(name)
      cancelAdd()
      return
    }

    setBusy(true)
    setError('')
    try {
      await onAdd(name)
      onChange(name)
      cancelAdd()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <label className="label">Program / Course</label>
      <div className="flex gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input min-w-0 flex-1"
          disabled={adding}
        >
          <option value="">Choose program</option>
          {programs.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        {!adding && (
          <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
            Add
          </Button>
        )}
      </div>

      {adding && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            className="input min-w-0 flex-1"
            placeholder="New program / course name"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value)
              if (error) setError('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitNew()
              }
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="button" onClick={submitNew} disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="secondary" onClick={cancelAdd} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  )
}
