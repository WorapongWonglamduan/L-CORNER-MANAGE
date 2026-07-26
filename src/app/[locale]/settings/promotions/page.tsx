import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import PromotionsContent from '@/components/pages/settings/promotions'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'promotions' })

  return {
    title: t('title'),
  }
}

export default async function PromotionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()

  if (!session) {
    redirect(`/${locale}/login`)
  }

  return <PromotionsContent />
}
