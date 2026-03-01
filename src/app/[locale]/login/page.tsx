import { LoginForm } from '@/components/auth/login-form'
import { LanguageSwitcher } from '@/components/language-switcher'
import { getTranslations } from 'next-intl/server'
import { Package, ShoppingCart, BarChart3 } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth.login' })
  
  return {
    title: `${t('title')} - Login`,
    description: t('subtitle'),
  }
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth.login' })
  
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-purple-600 p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="relative z-10 flex flex-col justify-between w-full">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-7 h-7" />
              </div>
              <h1 className="text-3xl font-bold">{t('title')}</h1>
            </div>
            <p className="text-xl text-blue-100 mb-12">
              {t('tagline')}<br />
              {t('taglineEn')}
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{t('features.inventory.title')}</h3>
                <p className="text-sm text-blue-100">{t('features.inventory.description')}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{t('features.sales.title')}</h3>
                <p className="text-sm text-blue-100">{t('features.sales.description')}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{t('features.reports.title')}</h3>
                <p className="text-sm text-blue-100">{t('features.reports.description')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="absolute top-8 right-8">
            <LanguageSwitcher />
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <LoginForm />
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t('footer')}
          </p>
        </div>
      </div>
    </div>
  )
}
