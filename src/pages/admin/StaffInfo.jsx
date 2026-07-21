import PeopleDirectory from './PeopleDirectory.jsx'
import { ROLE_LABELS, ROLES } from '../../lib/roles.js'

const STAFF_ROLE_OPTIONS = [
  { value: ROLES.SCHOOL_ADMIN, label: ROLE_LABELS[ROLES.SCHOOL_ADMIN] },
  { value: ROLES.FINANCE, label: ROLE_LABELS[ROLES.FINANCE] },
  { value: ROLES.ADMIN, label: ROLE_LABELS[ROLES.ADMIN] },
]

export default function StaffInfo() {
  return (
    <PeopleDirectory
      kind="staff"
      title="Staff Info"
      subtitle="Store office, finance, and admin staff profiles"
      defaultRole={ROLES.SCHOOL_ADMIN}
      roleOptions={STAFF_ROLE_OPTIONS}
    />
  )
}
