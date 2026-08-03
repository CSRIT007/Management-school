import { useMemo } from 'react'
import PeopleDirectory from './PeopleDirectory.jsx'
import { useLanguage } from '../../context/LanguageContext.jsx'
import { ROLES } from '../../lib/roles.js'

export default function StaffInfo() {
  const { t } = useLanguage()

  const roleOptions = useMemo(
    () => [
      { value: ROLES.SCHOOL_ADMIN, label: t('roles.school_admin') },
      { value: ROLES.FINANCE, label: t('roles.finance') },
      { value: ROLES.ADMIN, label: t('roles.admin') },
    ],
    [t]
  )

  return (
    <PeopleDirectory
      kind="staff"
      title={t('admin.staff.title')}
      subtitle={t('admin.staff.subtitle')}
      defaultRole={ROLES.SCHOOL_ADMIN}
      roleOptions={roleOptions}
    />
  )
}
