'use client'

import { LanguageSwitcher } from '@/components/language-switcher'
import { ShoppingCart } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { loginFeatures, brandingConfig } from './helper'
import { LoginForm } from './login-form'

export default function LoginPageContent() {
  const t = useTranslations('auth.login')

  
  
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-purple-600 p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="relative z-10 flex flex-col justify-between w-full">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className={`${brandingConfig.containerSize.large} bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center`}>
                <ShoppingCart className={brandingConfig.iconSize.large} />
              </div>
              <h1 className="text-3xl font-bold">{t('title')}</h1>
            </div>
            <p className="text-xl text-blue-100 mb-12">
              {t('tagline')}<br />
              {t('taglineEn')}
            </p>
          </div>

          <div className="space-y-6">
            {loginFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="flex items-start gap-4">
                  <div className={`${brandingConfig.containerSize.medium} bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center shrink-0`}>
                    <Icon className={brandingConfig.iconSize.medium} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{t(feature.titleKey)}</h3>
                    <p className="text-sm text-blue-100">{t(feature.descriptionKey)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

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
