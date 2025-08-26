/**
 * Error Handling Utilities
 * Centralized error handling and retry logic
 */

export class AppError extends Error {
  public readonly code: string
  public readonly statusCode?: number
  public readonly details?: any

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode?: number,
    details?: any
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed', details?: any) {
    super(message, 'NETWORK_ERROR', undefined, details)
    this.name = 'NetworkError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND_ERROR', 404)
    this.name = 'NotFoundError'
  }
}

/**
 * Parse error from various sources
 */
export function parseError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR')
  }

  if (typeof error === 'string') {
    return new AppError(error, 'UNKNOWN_ERROR')
  }

  return new AppError('An unknown error occurred', 'UNKNOWN_ERROR')
}

/**
 * Handle API response errors
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`
    let errorDetails: any

    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorMessage
      errorDetails = errorData.details || errorData
    } catch {
      // If we can't parse the error response, use status text
      errorMessage = response.statusText || errorMessage
    }

    switch (response.status) {
      case 400:
        throw new ValidationError(errorMessage, errorDetails)
      case 401:
        throw new AuthenticationError(errorMessage)
      case 403:
        throw new AuthorizationError(errorMessage)
      case 404:
        throw new NotFoundError(errorMessage)
      default:
        throw new AppError(errorMessage, 'API_ERROR', response.status, errorDetails)
    }
  }

  try {
    return await response.json()
  } catch (error) {
    throw new AppError('Failed to parse response', 'PARSE_ERROR')
  }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number
  delayMs: number
  backoffMultiplier: number
  retryCondition?: (error: Error) => boolean
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  retryCondition: (error) => {
    // Retry on network errors and 5xx server errors
    return error instanceof NetworkError || 
           (error instanceof AppError && error.statusCode && error.statusCode >= 500)
  }
}

/**
 * Retry wrapper for async operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...defaultRetryConfig, ...config }
  let lastError: Error

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = parseError(error)

      // If this is the last attempt or error shouldn't be retried, throw
      if (attempt === finalConfig.maxAttempts || !finalConfig.retryCondition!(lastError)) {
        throw lastError
      }

      // Wait before retrying
      const delay = finalConfig.delayMs * Math.pow(finalConfig.backoffMultiplier, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

/**
 * Safe async wrapper that catches and logs errors
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T,
  onError?: (error: Error) => void
): Promise<T | undefined> {
  try {
    return await operation()
  } catch (error) {
    const parsedError = parseError(error)
    
    // Log error
    console.error('Safe async operation failed:', parsedError)
    
    // Call error handler if provided
    onError?.(parsedError)
    
    return fallback
  }
}

/**
 * Error logging utility
 */
export function logError(error: Error, context?: string, metadata?: Record<string, any>) {
  const errorInfo = {
    message: error.message,
    name: error.name,
    stack: error.stack,
    context,
    metadata,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined
  }

  console.error('Error logged:', errorInfo)

  // In production, you would send this to an error reporting service
  // Example: Sentry.captureException(error, { extra: errorInfo })
}

/**
 * User-friendly error messages
 */
export function getUserFriendlyMessage(error: Error): string {
  if (error instanceof ValidationError) {
    return error.message
  }

  if (error instanceof AuthenticationError) {
    return 'Please sign in to continue.'
  }

  if (error instanceof AuthorizationError) {
    return 'You don\'t have permission to perform this action.'
  }

  if (error instanceof NotFoundError) {
    return 'The requested resource could not be found.'
  }

  if (error instanceof NetworkError) {
    return 'Network error. Please check your connection and try again.'
  }

  if (error instanceof AppError && error.statusCode && error.statusCode >= 500) {
    return 'Server error. Please try again later.'
  }

  return 'An unexpected error occurred. Please try again.'
}