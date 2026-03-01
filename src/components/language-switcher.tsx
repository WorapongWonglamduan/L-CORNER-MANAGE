'use client'

import { useParams, usePathname, useRouter } from 'next/navigation'
import { Globe } from 'lucide-react'

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
    <div className="inline-flex items-center gap-2 bg-white rounded-xl shadow-md border border-gray-200 p-1">
      <Globe className="w-4 h-4 text-gray-500 ml-2" />
      <button
        onClick={() => switchLanguage('th')}
        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
          locale === 'th'
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        ไทย
      </button>
      <button
        onClick={() => switchLanguage('en')}
        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
          locale === 'en'
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        EN
      </button>
    </div>
  )
}
