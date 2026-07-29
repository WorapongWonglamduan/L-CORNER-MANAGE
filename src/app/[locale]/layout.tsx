import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { setRequestLocale } from 'next-intl/server'
import { ToastProvider } from '@/components/ui/toast-provider'
import { OfflineBanner } from '@/components/ui/offline-banner'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/auth'

const locales = ['th', 'en']

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const messages = await getMessages()
  const session = await auth()

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <SessionProvider session={session}>
        {children}
        <ToastProvider />
        <OfflineBanner />
      </SessionProvider>
    </NextIntlClientProvider>
  )
}
