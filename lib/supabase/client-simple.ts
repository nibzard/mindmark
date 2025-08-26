/**
 * Supabase Client Configuration with Type Overrides
 * Provides typed client instances for database operations
 */

import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

/**
 * Browser client for client-side operations
 * Use this in React components and client-side code
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Server client for server-side operations
 * Use this in API routes, Server Components, and middleware
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle cookie setting errors in middleware
            console.warn('Cookie setting failed:', error)
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle cookie removal errors in middleware
            console.warn('Cookie removal failed:', error)
          }
        },
      },
    }
  )
}

/**
 * Service role client for administrative operations
 * Use this for operations requiring elevated privileges
 * Only use on the server side with service role key
 */
export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Type-safe Supabase client
 * Provides full TypeScript support for database operations
 */
export type SupabaseClient = ReturnType<typeof createSupabaseBrowserClient>