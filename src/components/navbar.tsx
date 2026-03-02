'use client'

import { LogOut, Settings } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/language-switcher'
import { theme } from '@/lib/theme'

interface NavbarProps {
  userName?: string
}

export function Navbar({ userName }: NavbarProps) {
  const t = useTranslations('dashboard')
  const tAuth = useTranslations('auth')
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push(`/${locale}/login`)
    router.refresh()
  }

  return (
    <div className={`${theme.gradients.primary} ${theme.shadows.lg}`}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-white">L</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{t('title')}</h1>
              <p className="text-sm text-blue-100">
                {t('welcome')}, <span className="font-semibold text-white">{userName}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={() => router.push(`/${locale}/settings`)}
              className="flex items-center gap-2 px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">ตั้งค่า</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">{tAuth('logout')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
