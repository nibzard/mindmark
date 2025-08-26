'use client'

/**
 * Toast Hook
 * React hook for managing toast notifications
 */

import { useState, useCallback, useRef } from 'react'
import { type Toast, type ToastType } from '@/components/ui/Toast'

export interface UseToastReturn {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
  success: (title: string, message?: string, options?: Partial<Toast>) => void
  error: (title: string, message?: string, options?: Partial<Toast>) => void
  warning: (title: string, message?: string, options?: Partial<Toast>) => void
  info: (title: string, message?: string, options?: Partial<Toast>) => void
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastIdRef = useRef(0)

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastIdRef.current}`
    const newToast: Toast = {
      id,
      duration: 5000,
      persistent: false,
      ...toast
    }

    setToasts(prev => [...prev, newToast])
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  // Convenience methods for different toast types
  const success = useCallback((
    title: string, 
    message?: string, 
    options: Partial<Toast> = {}
  ) => {
    return addToast({
      type: 'success',
      title,
      message,
      ...options
    })
  }, [addToast])

  const error = useCallback((
    title: string, 
    message?: string, 
    options: Partial<Toast> = {}
  ) => {
    return addToast({
      type: 'error',
      title,
      message,
      duration: 0, // Error toasts persist until manually closed
      persistent: true,
      ...options
    })
  }, [addToast])

  const warning = useCallback((
    title: string, 
    message?: string, 
    options: Partial<Toast> = {}
  ) => {
    return addToast({
      type: 'warning',
      title,
      message,
      duration: 7000, // Warning toasts stay longer
      ...options
    })
  }, [addToast])

  const info = useCallback((
    title: string, 
    message?: string, 
    options: Partial<Toast> = {}
  ) => {
    return addToast({
      type: 'info',
      title,
      message,
      ...options
    })
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info
  }
}

/**
 * Global Toast Provider Context
 */
import React, { createContext, useContext } from 'react'
import { ToastContainer } from '@/components/ui/Toast'

const ToastContext = createContext<UseToastReturn | null>(null)

export interface ToastProviderProps {
  children: React.ReactNode
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center'
}

export function ToastProvider({ children, position = 'top-right' }: ToastProviderProps) {
  const toastUtils = useToast()

  return (
    <ToastContext.Provider value={toastUtils}>
      {children}
      <ToastContainer
        toasts={toastUtils.toasts}
        onRemoveToast={toastUtils.removeToast}
        position={position}
      />
    </ToastContext.Provider>
  )
}

/**
 * Hook to use toast from context
 */
export function useToastContext(): UseToastReturn {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider')
  }
  return context
}

/**
 * Higher-order component for toast functionality
 */
export function withToast<P extends object>(
  Component: React.ComponentType<P & { toast: UseToastReturn }>
) {
  return function WithToastComponent(props: P) {
    const toast = useToast()
    return <Component {...props} toast={toast} />
  }
}