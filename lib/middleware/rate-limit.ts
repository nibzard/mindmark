/**
 * Rate Limiting Middleware
 * Protects AI API endpoints from abuse
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client-simple'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  keyGenerator?: (req: NextRequest) => Promise<string>
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store for rate limiting (use Redis in production)
const store: RateLimitStore = {}

/**
 * Clean up expired entries
 */
function cleanupExpiredEntries() {
  const now = Date.now()
  for (const key in store) {
    if (store[key].resetTime <= now) {
      delete store[key]
    }
  }
}

/**
 * Default key generator - uses user ID if authenticated, IP if not
 */
async function defaultKeyGenerator(req: NextRequest): Promise<string> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      return `user:${user.id}`
    }
  } catch {
    // Fall back to IP-based limiting
  }
  
  // Get IP address
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown'
  return `ip:${ip}`
}

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  const { maxRequests, windowMs, keyGenerator = defaultKeyGenerator } = config

  return async function rateLimitMiddleware(
    req: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    // Clean up expired entries periodically
    if (Math.random() < 0.1) {
      cleanupExpiredEntries()
    }

    const key = await keyGenerator(req)
    const now = Date.now()
    const resetTime = now + windowMs

    // Get or create rate limit entry
    let entry = store[key]
    if (!entry || entry.resetTime <= now) {
      entry = { count: 0, resetTime }
      store[key] = entry
    }

    // Check if rate limit exceeded
    if (entry.count >= maxRequests) {
      const timeUntilReset = Math.ceil((entry.resetTime - now) / 1000)
      
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${timeUntilReset} seconds.`,
          retryAfter: timeUntilReset
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString(),
            'Retry-After': timeUntilReset.toString()
          }
        }
      )
    }

    // Increment count and continue
    entry.count++
    
    const response = await handler()
    
    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', (maxRequests - entry.count).toString())
    response.headers.set('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString())
    
    return response
  }
}

/**
 * Predefined rate limit configurations
 */
export const rateLimitConfigs = {
  // AI generation: 20 requests per minute
  aiGenerate: {
    maxRequests: 20,
    windowMs: 60 * 1000
  },
  
  // AI embeddings: 100 requests per minute (lighter operation)
  aiEmbed: {
    maxRequests: 100,
    windowMs: 60 * 1000
  },
  
  // Document operations: 50 requests per minute
  documents: {
    maxRequests: 50,
    windowMs: 60 * 1000
  },
  
  // Verification operations: 10 requests per minute (expensive)
  verification: {
    maxRequests: 10,
    windowMs: 60 * 1000
  },
  
  // Authentication: 5 requests per minute (security sensitive)
  auth: {
    maxRequests: 5,
    windowMs: 60 * 1000
  }
}

/**
 * High-frequency rate limit for AI streaming
 */
export const streamingRateLimit = rateLimit({
  maxRequests: 100,
  windowMs: 10 * 1000, // 10 seconds
  keyGenerator: async (req) => {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user ? `stream:${user.id}` : `stream:${req.headers.get('x-forwarded-for') || 'unknown'}`
  }
})

/**
 * Standard API rate limit
 */
export const apiRateLimit = rateLimit(rateLimitConfigs.documents)

/**
 * AI operation rate limit
 */
export const aiRateLimit = rateLimit(rateLimitConfigs.aiGenerate)

/**
 * Verification rate limit
 */
export const verificationRateLimit = rateLimit(rateLimitConfigs.verification)
