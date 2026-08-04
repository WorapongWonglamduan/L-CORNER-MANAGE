import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import AdminShopsContent from "@/components/pages/admin/shops/list"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'adminShops' })

  return {
    title: t('title'),
  }
}

export default async function AdminShopsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()

  if (!session) {
    redirect(`/${locale}/login`)
  }
  if (!session.user.is_super_admin) {
    redirect(`/${locale}/dashboard`)
  }

  return <AdminShopsContent />
}
