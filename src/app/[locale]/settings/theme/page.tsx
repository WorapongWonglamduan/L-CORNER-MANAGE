import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import ThemeContent from '@/components/pages/settings/theme'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'theme' })

  return {
    title: t('title'),
  }
}

export default async function ThemePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()

  if (!session) {
    redirect(`/${locale}/login`)
  }

  return <ThemeContent />
}
