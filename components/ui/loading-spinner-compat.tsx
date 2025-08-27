'use client'

/**
 * LoadingSpinner Compatibility Layer
 * Maintains the old LoadingSpinner API using the new Spinner component
 */

import React from 'react'
import { Spinner } from './spinner'
import { cn } from '@/lib/utils/ui'

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'blue' | 'white' | 'gray' | 'green' | 'default' | 'secondary' | 'destructive'
  className?: string
  text?: string
}

export function LoadingSpinner({
  size = 'md',
  color = 'default',
  className = '',
  text
}: LoadingSpinnerProps) {
  // Map old color system to new variants
  const variantMap = {
    blue: 'default',
    white: 'secondary', 
    gray: 'secondary',
    green: 'default',
    default: 'default',
    secondary: 'secondary',
    destructive: 'destructive'
  } as const

  const variant = variantMap[color] || 'default'

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Spinner size={size} variant={variant} />
      {text && (
        <span className="ml-2 text-sm text-muted-foreground">
          {text}
        </span>
      )}
    </div>
  )
}

// Inline spinner for buttons
export interface InlineSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'blue' | 'white' | 'gray' | 'green' | 'default' | 'secondary' | 'destructive'
  className?: string
}

export function InlineSpinner({
  size = 'sm',
  color = 'default',
  className = ''
}: InlineSpinnerProps) {
  const variantMap = {
    blue: 'default',
    white: 'secondary', 
    gray: 'secondary',
    green: 'default',
    default: 'default',
    secondary: 'secondary',
    destructive: 'destructive'
  } as const

  const variant = variantMap[color] || 'default'

  return (
    <Spinner 
      size={size} 
      variant={variant}
      className={className} 
    />
  )
}

// Loading overlay component
export interface LoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  text?: string
  className?: string
}

export function LoadingOverlay({ 
  isLoading, 
  children, 
  text, 
  className = '' 
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/75 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center space-y-2">
            <Spinner size="lg" />
            {text && (
              <span className="text-sm text-muted-foreground">
                {text}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}