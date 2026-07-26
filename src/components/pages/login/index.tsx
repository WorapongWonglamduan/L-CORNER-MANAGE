'use client'

import { LanguageSwitcher } from '@/components/language-switcher'
import { ShoppingCart } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { loginFeatures, brandingConfig } from './helper'
import { LoginForm } from './login-form'
import { theme } from '@/lib/theme'

export default function LoginPageContent() {
  const t = useTranslations('auth.login')

  
  
  return (
    <div className={`flex min-h-screen ${theme.gradients.background}`}>
      <div className={`hidden lg:flex lg:w-1/2 ${theme.gradients.primaryBr} p-12 text-white relative overflow-hidden`}>
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="relative z-10 flex flex-col justify-between w-full">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className={`${brandingConfig.containerSize.large} bg-white/20 backdrop-blur-sm ${theme.rounded.md} flex items-center justify-center ${theme.shadows.lg}`}>
                <ShoppingCart className={brandingConfig.iconSize.large} />
              </div>
              <h1 className="text-3xl font-bold">{t('title')}</h1>
            </div>
            <p className="text-xl text-blue-100 mb-12 leading-relaxed">
              {t('tagline')}<br />
              {t('taglineEn')}
            </p>
          </div>

          <div className="space-y-6">
            {loginFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="flex items-start gap-4 group">
                  <div className={`${brandingConfig.containerSize.medium} bg-white/20 backdrop-blur-sm ${theme.rounded.sm} flex items-center justify-center shrink-0 ${theme.shadows.md} group-hover:bg-white/30 transition-all`}>
                    <Icon className={brandingConfig.iconSize.medium} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{t(feature.titleKey)}</h3>
                    <p className="text-sm text-blue-100 leading-relaxed">{t(feature.descriptionKey)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-white/50 backdrop-blur-sm">
        <div className="w-full max-w-md">
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>

          <div className={`bg-white ${theme.rounded.xl} ${theme.shadows['2xl']} p-6 sm:p-8 ${theme.borders.medium}`}>
            <LoginForm />
          </div>

          <p className="text-center text-sm text-gray-600 mt-6 font-medium">
            {t('footer')}
          </p>
        </div>
      </div>
    </div>
  )
}
