import { useCallback, useEffect, useMemo, useState } from 'react'
import { get, put } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useLanguage } from '../../context/LanguageContext.jsx'
import { ROLES } from '../../lib/roles.js'
import { todayIso, formatDisplayDate } from '../../lib/dateFormat.js'
import PageHeader from '../../components/ui/PageHeader.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import DateField from '../../components/ui/DateField.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import ExportReportButton from '../../components/ui/ExportReportButton.jsx'
import TableExportHeader from '../../components/ui/TableExportHeader.jsx'
import {
  ATTENDANCE_EXPORT_COLUMNS,
  ATTENDANCE_REPORT_TITLE,
  ATTENDANCE_STATUSES,
  downloadAttendanceCsv,
} from '../../lib/exports/attendanceExport.js'

const STATUS_BADGE = {
  Present: 'success',
  Absent: 'danger',
  Late: 'warning',
  Excused: 'info',
}

function statusVariant(status) {
  return STATUS_BADGE[status] || 'default'
}

export default function ClassAttendance() {
  const { user, role } = useAuth()
  const { t } = useLanguage()
  const isTeacher = role === ROLES.TEACHER

  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [date, setDate] = useState(todayIso())
  const [rows, setRows] = useState([])
  const [className, setClassName] = useState('')
  const [loading, setLoading] = useState(true)
  const [sheetLoading, setSheetLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [msgError, setMsgError] = useState(false)
  const [dirty, setDirty] = useState(false)

  const loadClasses = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await get('/api/classes')
      const sorted = [...(list || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
      setClasses(sorted)
      setClassId((prev) => {
        if (prev && sorted.some((c) => c.id === prev)) return prev
        return sorted[0]?.id || ''
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadClasses() }, [loadClasses])

  const loadSheet = useCallback(async (cid = classId, d = date) => {
    if (!cid || !d) {
      setRows([])
      setClassName('')
      return
    }
    setSheetLoading(true)
    setError('')
    setMessage('')
    try {
      const qs = new URLSearchParams({ classId: cid, date: d })
      const sheet = await get(`/api/attendance?${qs}`)
      setClassName(sheet.className || '')
      setRows((sheet.rows || []).map((r) => ({
        studentId: r.studentId,
        studentName: r.studentName,
        status: r.status || 'Present',
        note: r.note || '',
        saved: !!r.saved,
      })))
      setDirty(false)
    } catch (e) {
      setError(e.message)
      setRows([])
    } finally {
      setSheetLoading(false)
    }
  }, [classId, date])

  useEffect(() => {
    if (classId && date) loadSheet(classId, date)
  }, [classId, date, loadSheet])

  const counts = useMemo(() => {
    const c = { Present: 0, Absent: 0, Late: 0, Excused: 0 }
    for (const r of rows) {
      if (c[r.status] != null) c[r.status] += 1
    }
    return c
  }, [rows])

  const updateRow = (studentId, patch) => {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r)))
    setDirty(true)
    setMessage('')
  }

  const markAll = (status) => {
    setRows((prev) => prev.map((r) => ({ ...r, status })))
    setDirty(true)
    setMessage('')
  }

  const showMsg = (text, isError = false) => {
    setMessage(text)
    setMsgError(isError)
  }

  const save = async () => {
    if (!classId || !date) {
      showMsg('Select a class and date.', true)
      return
    }
    if (!rows.length) {
      showMsg('No students enrolled in this class.', true)
      return
    }
    setSaving(true)
    setMessage('')
    setMsgError(false)
    try {
      const sheet = await put('/api/attendance', {
        classId,
        date,
        rows: rows.map((r) => ({
          studentId: r.studentId,
          studentName: r.studentName,
          status: r.status,
          note: r.note,
        })),
      })
      setRows((sheet.rows || []).map((r) => ({
        studentId: r.studentId,
        studentName: r.studentName,
        status: r.status || 'Present',
        note: r.note || '',
        saved: true,
      })))
      setDirty(false)
      showMsg(`Attendance saved for ${sheet.className || classId} · ${formatDisplayDate(sheet.date)}.`)
    } catch (e) {
      showMsg(e.message, true)
    } finally {
      setSaving(false)
    }
  }

  const exportRows = useMemo(
    () => rows.map((r) => ({
      ...r,
      date,
      classId,
      className,
    })),
    [rows, date, classId, className]
  )

  const columns = [
    {
      key: 'studentId',
      label: 'Student ID',
      className: 'whitespace-nowrap font-mono font-semibold',
    },
    {
      key: 'studentName',
      label: t('common.name'),
      className: 'whitespace-nowrap font-semibold',
    },
    {
      key: 'status',
      label: t('common.status'),
      className: 'whitespace-nowrap',
      render: (r) => (
        <select
          className="input min-w-[8rem] py-1.5 text-sm"
          value={r.status}
          onChange={(e) => updateRow(r.studentId, { status: e.target.value })}
        >
          {ATTENDANCE_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      ),
    },
    {
      key: 'badge',
      label: '',
      className: 'whitespace-nowrap',
      render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
    },
    {
      key: 'note',
      label: t('common.note'),
      render: (r) => (
        <input
          className="input py-1.5 text-sm"
          value={r.note}
          onChange={(e) => updateRow(r.studentId, { note: e.target.value })}
          placeholder="Optional"
        />
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('students.attendance.title')}
        subtitle={
          isTeacher
            ? 'Mark daily attendance for your assigned classes'
            : t('students.attendance.subtitle')
        }
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400">
          {error}
        </div>
      )}

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${msgError ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('common.present')} value={sheetLoading ? '…' : counts.Present} accent="emerald" />
        <StatCard label={t('common.absent')} value={sheetLoading ? '…' : counts.Absent} accent="rose" />
        <StatCard label={t('common.late')} value={sheetLoading ? '…' : counts.Late} accent="amber" />
        <StatCard label={t('common.excused')} value={sheetLoading ? '…' : counts.Excused} accent="indigo" />
      </div>

      <div className="panel grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
        <div>
          <label className="label">Class</label>
          <select
            className="input"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            disabled={loading || !classes.length}
          >
            {!classes.length && <option value="">No classes available</option>}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.name}
              </option>
            ))}
          </select>
          {isTeacher && (
            <p className="mt-1 text-xs text-slate-400">
              Showing classes assigned to {user?.name || 'you'}
            </p>
          )}
        </div>
        <DateField label={t('common.date')} value={date} onChange={setDate} />
        <div className="flex flex-wrap items-end gap-2">
          <Button type="button" variant="secondary" onClick={() => loadSheet()} disabled={sheetLoading || !classId}>
            Reload
          </Button>
          <Button type="button" onClick={save} disabled={saving || !rows.length || sheetLoading}>
            {saving ? t('common.saving') : dirty ? 'Save attendance' : 'Save attendance'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="self-center text-sm text-slate-500">Mark all:</span>
        {ATTENDANCE_STATUSES.map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => markAll(s)}
            disabled={!rows.length || sheetLoading}
          >
            {s}
          </Button>
        ))}
      </div>

      <div>
        <TableExportHeader
          title={className ? `${className} · ${formatDisplayDate(date)}` : 'Attendance sheet'}
          count={rows.length}
        >
          <ExportReportButton
            reportTitle={ATTENDANCE_REPORT_TITLE}
            columnDefs={ATTENDANCE_EXPORT_COLUMNS}
            getRows={() => exportRows}
            onDownload={downloadAttendanceCsv}
            disabled={sheetLoading || rows.length === 0}
            size="sm"
          />
        </TableExportHeader>
        <DataTable
          columns={columns}
          rows={rows}
          emptyMessage={
            loading || sheetLoading
              ? t('common.loading')
              : !classId
                ? 'Select a class to take attendance.'
                : 'No students enrolled in this class.'
          }
        />
      </div>
    </div>
  )
}
