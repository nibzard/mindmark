/**
 * Authentication Service
 * Handles user authentication and session management following domain-driven design
 */

import { createSupabaseBrowserClient, createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { type Writer, type WriterInsert, type WriterUpdate } from '@/lib/types/database'
import { type User } from '@supabase/supabase-js'

/**
 * AuthService Interface
 * Defines all authentication operations with clear domain boundaries
 */
export interface AuthService {
  // Authentication operations
  signUp(email: string, password: string, metadata?: WriterInsert): Promise<AuthResult>
  signIn(email: string, password: string): Promise<AuthResult>
  signOut(): Promise<void>
  
  // Session management
  getCurrentUser(): Promise<User | null>
  getCurrentWriter(): Promise<Writer | null>
  
  // Writer profile management
  createWriterProfile(userId: string, data: WriterInsert): Promise<Writer>
  updateWriterProfile(userId: string, data: WriterUpdate): Promise<Writer>
  getWriterProfile(userId: string): Promise<Writer | null>
}

/**
 * Authentication Result
 * Standardized response for auth operations
 */
export interface AuthResult {
  success: boolean
  user?: User
  writer?: Writer
  error?: string
}

/**
 * Browser Auth Service Implementation
 * For use in client-side React components
 */
export class BrowserAuthService implements AuthService {
  private supabase = createSupabaseBrowserClient()

  /**
   * Sign up a new user and create writer profile
   */
  async signUp(email: string, password: string, metadata?: WriterInsert): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata ? {
            username: metadata.username,
            display_name: metadata.display_name,
          } : {}
        }
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (data.user) {
        // Create writer profile
        const writerData: WriterInsert = {
          id: data.user.id,
          username: metadata?.username,
          display_name: metadata?.display_name,
          public_key: metadata?.public_key,
          settings: metadata?.settings || {}
        }

        try {
          const writer = await this.createWriterProfile(data.user.id, writerData)
          return { success: true, user: data.user, writer }
        } catch (profileError) {
          console.error('Failed to create writer profile:', profileError)
          return { success: true, user: data.user, error: 'Profile creation failed' }
        }
      }

      return { success: true, user: data.user || undefined }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Sign up failed' }
    }
  }

  /**
   * Sign in existing user
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (data.user) {
        const writer = await this.getCurrentWriter()
        return { success: true, user: data.user || undefined, writer: writer || undefined }
      }

      return { success: false, error: 'Authentication failed' }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Sign in failed' }
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    await this.supabase.auth.signOut()
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await this.supabase.auth.getUser()
    return user
  }

  /**
   * Get current writer profile
   */
  async getCurrentWriter(): Promise<Writer | null> {
    const user = await this.getCurrentUser()
    if (!user) return null

    return this.getWriterProfile(user.id)
  }

  /**
   * Create writer profile in database
   */
  async createWriterProfile(userId: string, data: WriterInsert): Promise<Writer> {
    const { data: writer, error } = await this.supabase
      .from('writers')
      .insert(data)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create writer profile: ${error.message}`)
    }

    return writer
  }

  /**
   * Update writer profile
   */
  async updateWriterProfile(userId: string, data: WriterUpdate): Promise<Writer> {
    const { data: writer, error } = await this.supabase
      .from('writers')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update writer profile: ${error.message}`)
    }

    return writer
  }

  /**
   * Get writer profile by user ID
   */
  async getWriterProfile(userId: string): Promise<Writer | null> {
    const { data: writer, error } = await this.supabase
      .from('writers')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found
        return null
      }
      throw new Error(`Failed to get writer profile: ${error.message}`)
    }

    return writer
  }
}

/**
 * Server Auth Service Implementation
 * For use in API routes and Server Components
 */
export class ServerAuthService implements AuthService {
  private async getSupabase() {
    return await createSupabaseServerClient()
  }

  async signUp(email: string, password: string, metadata?: WriterInsert): Promise<AuthResult> {
    // Server-side sign up implementation
    // Similar to browser implementation but uses server client
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata ? {
            username: metadata.username,
            display_name: metadata.display_name,
          } : {}
        }
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, user: data.user || undefined }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Sign up failed' }
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, user: data.user || undefined }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Sign in failed' }
    }
  }

  async signOut(): Promise<void> {
    const supabase = await this.getSupabase()
    await supabase.auth.signOut()
  }

  async getCurrentUser(): Promise<User | null> {
    const supabase = await this.getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  async getCurrentWriter(): Promise<Writer | null> {
    const user = await this.getCurrentUser()
    if (!user) return null

    return this.getWriterProfile(user.id)
  }

  async createWriterProfile(userId: string, data: WriterInsert): Promise<Writer> {
    const supabase = await this.getSupabase()
    const { data: writer, error } = await supabase
      .from('writers')
      .insert(data)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create writer profile: ${error.message}`)
    }

    return writer
  }

  async updateWriterProfile(userId: string, data: WriterUpdate): Promise<Writer> {
    const supabase = await this.getSupabase()
    const { data: writer, error } = await supabase
      .from('writers')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update writer profile: ${error.message}`)
    }

    return writer
  }

  async getWriterProfile(userId: string): Promise<Writer | null> {
    const supabase = await this.getSupabase()
    const { data: writer, error } = await supabase
      .from('writers')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get writer profile: ${error.message}`)
    }

    return writer
  }
}

/**
 * Factory function to create appropriate auth service
 * Automatically determines client vs server context
 */
export function createAuthService(): AuthService {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    return new BrowserAuthService()
  } else {
    return new ServerAuthService()
  }
}