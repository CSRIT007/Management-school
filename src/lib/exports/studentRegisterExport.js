import { formatDisplayDate } from '../dateFormat.js'
import { downloadCsv, reportFilename } from '../exportCsv.js'
import { SCHOOL_NAME } from '../schoolBrand.js'

export const STUDENT_REPORT_TITLE = 'Register Students'

export const STUDENT_EXPORT_COLUMNS = [
  { key: 'id', label: 'Student ID', getValue: (r) => r.id || '' },
  { key: 'name', label: 'Full Name', getValue: (r) => r.name || '' },
  { key: 'email', label: 'Email', getValue: (r) => r.email || '' },
  { key: 'phone', label: 'Phone', getValue: (r) => r.phone || '' },
  { key: 'address', label: 'Address', getValue: (r) => r.address || '' },
  { key: 'dob', label: 'Date of Birth', getValue: (r) => formatDisplayDate(r.dob) },
  { key: 'emergency', label: 'Emergency Contact', getValue: (r) => r.emergency || '' },
  { key: 'program', label: 'Program / Course', getValue: (r) => r.program || '' },
]

export const STUDENT_FILTER_INITIAL = { program: 'all' }

export function filterStudents(students, filters) {
  return students.filter((student) => {
    if (filters.program !== 'all' && (student.program || '') !== filters.program) return false
    return true
  })
}

export function downloadStudentRegisterCsv({ columns, rows, reportTitle = STUDENT_REPORT_TITLE }) {
  downloadCsv(reportFilename(reportTitle), columns, rows, {
    schoolName: SCHOOL_NAME,
    reportTitle,
  })
}
