import './globals.css'
import { Kanit } from 'next/font/google'
import { headers } from 'next/headers'

const kanit = Kanit({
  subsets: ['latin', 'thai'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-kanit',
  display: 'swap',
})

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  const locale = pathname.split('/')[1] || 'th'
  
  return (
    <html lang={locale}>
      <body className={kanit.className}>
        {children}
      </body>
    </html>
  )
}
