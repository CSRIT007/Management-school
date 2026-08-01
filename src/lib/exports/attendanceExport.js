import { formatDisplayDate } from '../dateFormat.js'
import { downloadCsv, reportFilename } from '../exportCsv.js'
import { SCHOOL_NAME } from '../schoolBrand.js'

export const ATTENDANCE_REPORT_TITLE = 'Class Attendance'

export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Excused']

export const ATTENDANCE_EXPORT_COLUMNS = [
  { key: 'studentId', label: 'Student ID', getValue: (r) => r.studentId || '' },
  { key: 'studentName', label: 'Student Name', getValue: (r) => r.studentName || '' },
  { key: 'status', label: 'Status', getValue: (r) => r.status || '' },
  { key: 'note', label: 'Note', getValue: (r) => r.note || '' },
  { key: 'date', label: 'Date', getValue: (r) => formatDisplayDate(r.date) },
  { key: 'classId', label: 'Class ID', getValue: (r) => r.classId || '' },
  { key: 'className', label: 'Class Name', getValue: (r) => r.className || '' },
]

export function downloadAttendanceCsv({ columns, rows, reportTitle = ATTENDANCE_REPORT_TITLE }) {
  downloadCsv(reportFilename(reportTitle), columns, rows, {
    schoolName: SCHOOL_NAME,
    reportTitle,
  })
}
