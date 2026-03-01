import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from './auth'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip auth check for login page and public routes
  const isLoginPage = pathname.includes('/login')
  const isPublicRoute = isLoginPage || pathname.includes('/api/auth')
  
  // Always run i18n middleware first
  const response = intlMiddleware(request)
  
  // Skip auth check for public routes
  if (isPublicRoute) {
    return response
  }
  
  // Check auth for protected routes
  const isProtectedRoute = 
    pathname.includes('/dashboard') ||
    pathname.includes('/pos') ||
    pathname.includes('/products') ||
    pathname.includes('/inventory') ||
    pathname.includes('/reports')
  
  if (isProtectedRoute) {
    const session = await auth()
    if (!session) {
      const locale = pathname.split('/')[1] || 'th'
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }
  }
  
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
