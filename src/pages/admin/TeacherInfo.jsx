import PeopleDirectory from './PeopleDirectory.jsx'
import { ROLES } from '../../lib/roles.js'

export default function TeacherInfo() {
  return (
    <PeopleDirectory
      kind="teachers"
      title="Teacher Info"
      subtitle="Store teacher profiles, employment type, pay, and education"
      defaultRole={ROLES.TEACHER}
    />
  )
}
