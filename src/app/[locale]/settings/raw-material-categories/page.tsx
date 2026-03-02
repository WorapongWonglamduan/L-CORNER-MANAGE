import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import RawMaterialCategoriesContent from '@/components/pages/settings/raw-material-categories'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'settings.rawMaterialCategories' })
  
  return {
    title: t('title'),
  }
}

export default async function RawMaterialCategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()

  if (!session) {
    redirect(`/${locale}/login`)
  }

  return <RawMaterialCategoriesContent />
}
