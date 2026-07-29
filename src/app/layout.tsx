import './globals.css'
import { Kanit } from 'next/font/google'
import { headers } from 'next/headers'
import { getThemeColors } from '@/lib/theme-settings'
import { ThemeProvider } from '@/components/theme-provider'

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
  const theme = await getThemeColors()

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      style={
        {
          '--primary': theme.theme_color,
          '--primary-light': theme.theme_color_light,
          '--primary-dark': theme.theme_color_dark,
        } as React.CSSProperties
      }
    >
      <body className={kanit.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
