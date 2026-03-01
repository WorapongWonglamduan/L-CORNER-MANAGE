'use client'

import { useParams, usePathname, useRouter } from 'next/navigation'
import { Globe } from 'lucide-react'
import { theme } from '@/lib/theme'

export function LanguageSwitcher() {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const locale = params.locale as string

  const switchLanguage = (newLocale: string) => {
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPathname)
    router.refresh()
  }

  return (
    <div className={`inline-flex items-center gap-2 bg-white ${theme.rounded.md} ${theme.shadows.md} ${theme.borders.medium} p-1`}>
      <Globe className="w-4 h-4 text-gray-500 ml-2" />
      <button
        onClick={() => switchLanguage('th')}
        className={`px-4 py-2 text-sm font-semibold ${theme.rounded.sm} transition-all duration-200 ${
          locale === 'th'
            ? `${theme.gradients.primary} text-white ${theme.shadows.md}`
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        ไทย
      </button>
      <button
        onClick={() => switchLanguage('en')}
        className={`px-4 py-2 text-sm font-semibold ${theme.rounded.sm} transition-all duration-200 ${
          locale === 'en'
            ? `${theme.gradients.primary} text-white ${theme.shadows.md}`
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        EN
      </button>
    </div>
  )
}
