'use client'

import { useParams, usePathname, useRouter } from 'next/navigation'
import { Globe } from 'lucide-react'
import { theme } from '@/lib/theme'

interface LanguageSwitcherProps {
  isCollapsed?: boolean
}

export function LanguageSwitcher({ isCollapsed = false }: LanguageSwitcherProps) {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const locale = params.locale as string

  const switchLanguage = (newLocale: string) => {
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPathname)
    router.refresh()
  }

  if (isCollapsed) {
    return (
      <button
        onClick={() => switchLanguage(locale === 'th' ? 'en' : 'th')}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white hover:bg-white/10 rounded-lg transition-colors"
        title={locale === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
      >
        <Globe className="w-5 h-5 shrink-0" />
      </button>
    )
  }

  return (
    <div className={`inline-flex items-center gap-2 bg-white dark:bg-gray-800 ${theme.rounded.md} ${theme.shadows.md} ${theme.borders.medium} p-1`}>
      <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400 ml-2" />
      <button
        onClick={() => switchLanguage('th')}
        className={`px-4 py-2 text-sm font-semibold ${theme.rounded.sm} transition-all duration-200 ${
          locale === 'th'
            ? `${theme.gradients.primary} text-white ${theme.shadows.md}`
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        ไทย
      </button>
      <button
        onClick={() => switchLanguage('en')}
        className={`px-4 py-2 text-sm font-semibold ${theme.rounded.sm} transition-all duration-200 ${
          locale === 'en'
            ? `${theme.gradients.primary} text-white ${theme.shadows.md}`
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        EN
      </button>
    </div>
  )
}
