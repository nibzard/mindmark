/**
 * Authentication Middleware
 * Handles route protection and session management
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { type Database } from '@/lib/types/database'

/**
 * Protected routes that require authentication
 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/editor',
  '/documents',
  '/journals',
  '/settings'
]

/**
 * Auth routes that should redirect if already authenticated
 */
const AUTH_ROUTES = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password'
]

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/verify',
  '/certificates'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // Create Supabase client with request/response
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Check authentication status
  const { data: { user }, error } = await supabase.auth.getUser()

  // If there's an auth error, clear cookies and redirect to login
  if (error) {
    console.error('Auth middleware error:', error)
    if (isProtectedRoute(pathname)) {
      return redirectToLogin(request)
    }
    return response
  }

  // Handle protected routes
  if (isProtectedRoute(pathname)) {
    if (!user) {
      return redirectToLogin(request)
    }
    
    // Check if user has a writer profile
    try {
      const { data: writer } = await supabase
        .from('writers')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!writer) {
        // Redirect to profile setup if writer profile doesn't exist
        return NextResponse.redirect(new URL('/auth/setup-profile', request.url))
      }
    } catch (profileError) {
      console.error('Error checking writer profile:', profileError)
      return redirectToLogin(request)
    }
  }

  // Handle auth routes (redirect if already authenticated)
  if (isAuthRoute(pathname) && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Allow access to public routes
  return response
}

/**
 * Check if route requires authentication
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Check if route is an auth route
 */
function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Redirect to login with return URL
 */
function redirectToLogin(request: NextRequest): NextResponse {
  const url = new URL('/auth/login', request.url)
  url.searchParams.set('redirect', request.nextUrl.pathname)
  return NextResponse.redirect(url)
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}