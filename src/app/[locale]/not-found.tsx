import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { FileQuestion } from 'lucide-react'

export default function LocaleNotFound() {
  const t = useTranslations('notFound')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-6">
            <FileQuestion className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            ไม่พบหน้าที่คุณต้องการ
          </h2>
          <p className="text-gray-600 mb-8">
            Page Not Found
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/"
            className="block w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200"
          >
            กลับสู่หน้าหลัก
          </Link>
          <Link
            href="/dashboard"
            className="block w-full rounded-xl border-2 border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200"
          >
            ไปที่แดชบอร์ด
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          หากคุณคิดว่านี่เป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบ
        </p>
      </div>
    </div>
  )
}
