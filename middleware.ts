import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from './auth'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const locale = pathname.split('/')[1] || 'th'
  
  const isLoginPage = pathname.includes('/login')
  const isApiRoute = pathname.includes('/api/auth')
  
  // Always run i18n middleware first
  const response = intlMiddleware(request)
  
  // Skip auth check for API routes
  if (isApiRoute) {
    return response
  }
  
  // Get session
  const session = await auth()
  
  // If user is authenticated and trying to access login page, redirect to dashboard
  if (isLoginPage && session) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
  }
  
  // If user is not authenticated and trying to access login page, allow access
  if (isLoginPage && !session) {
    return response
  }
  
  // Check auth for protected routes
  const isProtectedRoute = 
    pathname.includes('/dashboard') ||
    pathname.includes('/pos') ||
    pathname.includes('/products') ||
    pathname.includes('/inventory') ||
    pathname.includes('/reports')
  
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
  }
  
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
