import PeopleDirectory from './PeopleDirectory.jsx'
import { ROLES } from '../../lib/roles.js'

export default function TeacherInfo() {
  return (
    <PeopleDirectory
      kind="teachers"
      title="Teacher Info"
      subtitle="Store teacher profiles and login accounts used for class assignment"
      defaultRole={ROLES.TEACHER}
    />
  )
}
