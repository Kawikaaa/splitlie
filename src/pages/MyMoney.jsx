import { Navigate } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import MyMoneyPanel from '../features/accounts/MyMoneyPanel'

export default function MyMoney({ activeSpace, user, refreshKey }) {
  const { t } = useLanguage()
  if (activeSpace.type !== 'personal') return <Navigate to="/" replace />

  return <div className="page my-money-page">
    <header className="page-header"><div><h1>{t('moneyTitle')}</h1></div></header>
    <MyMoneyPanel key={`${user.id}:${activeSpace.id}:${activeSpace.currency}:${refreshKey}`}
      userId={user.id} spaceId={activeSpace.id} currency={activeSpace.currency || 'USD'} standalone />
  </div>
}
