import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import IngredientsAndContainersContent from "@/components/pages/settings/ingredients-and-containers/list"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'settings.ingredientsAndContainers' })

  return {
    title: t('title'),
  }
}

export default async function IngredientsAndContainersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()

  if (!session) {
    redirect(`/${locale}/login`)
  }

  return <IngredientsAndContainersContent />
}
