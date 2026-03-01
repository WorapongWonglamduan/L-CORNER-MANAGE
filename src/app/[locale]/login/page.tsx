import { getTranslations } from 'next-intl/server'
import LoginPageContent from '@/components/pages/login'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth.login' })
  
  return {
    title: `${t('title')} - Login`,
    description: t('subtitle'),
  }
}

export default async function LoginPage() {
  return <LoginPageContent />
}
