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
  // Deliberately NOT process.env.NODE_ENV: the standalone server.js that
  // Next.js generates for a production build hardcodes
  // `process.env.NODE_ENV = 'production'` as its first line (see
  // node_modules/next/dist/build/utils.js) — it overwrites the container's
  // NODE_ENV the instant the process starts, before any of our code runs.
  // There is no layer (.env, docker-compose, container env) that can make
  // NODE_ENV differ from "production" in a deployed standalone build, so a
  // dedicated var (SITE, set per stack in docker-compose.yml) is the only
  // way to tell which environment this is.
  const showTestAccount = process.env.SITE !== 'production'

  return <LoginPageContent showTestAccount={showTestAccount} />
}
