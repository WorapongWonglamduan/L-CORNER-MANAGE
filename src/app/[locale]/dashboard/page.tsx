import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import DashboardContent from '@/components/pages/dashboard'

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

  if (!session) {
    redirect(`/${locale}/login`)
  }

  return (
    <DashboardContent 
      userName={session.user?.name ?? undefined}
      userRoles={session.user?.roles}
      userPermissions={session.user?.permissions}
    />
  )
}
