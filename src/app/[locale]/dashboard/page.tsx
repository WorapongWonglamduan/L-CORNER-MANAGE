import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dashboard' })
  
  return {
    title: t('title'),
  }
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  const t = await getTranslations({ locale, namespace: 'dashboard' })

  if (!session) {
    redirect(`/${locale}/login`)
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="mt-4 text-gray-600">
        {t('welcome')}, {session.user?.name}
      </p>
      <p className="mt-2 text-sm text-gray-500">
        {t('role')}: {session.user?.roles?.join(', ')}
      </p>
      <div className="mt-4">
        <p className="text-sm font-semibold">Permissions:</p>
        <p className="text-xs text-gray-500">{session.user?.permissions?.join(', ')}</p>
      </div>
    </div>
  )
}
