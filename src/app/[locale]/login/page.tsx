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
  // Read here, not inside login-form.tsx: that file is a 'use client'
  // component, and Next.js inlines process.env.NODE_ENV into the client
  // bundle at `next build` time (always "production" for a real build,
  // regardless of the container's actual runtime NODE_ENV) — only a Server
  // Component reads the real per-request value.
  const showTestAccount = process.env.NODE_ENV !== 'production'

  return <LoginPageContent showTestAccount={showTestAccount} />
}
