import PeopleDirectory from './PeopleDirectory.jsx'
import { useLanguage } from '../../context/LanguageContext.jsx'
import { ROLES } from '../../lib/roles.js'

export default function TeacherInfo() {
  const { t } = useLanguage()

  return (
    <PeopleDirectory
      kind="teachers"
      title={t('admin.teachers.title')}
      subtitle={t('admin.teachers.subtitle')}
      defaultRole={ROLES.TEACHER}
    />
  )
}
