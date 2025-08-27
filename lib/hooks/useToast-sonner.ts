'use client'

/**
 * Toast Hook - Sonner Integration
 * React hook for managing toast notifications using Sonner
 */

import { toast } from 'sonner'

export interface UseToastReturn {
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
  promise: <T>(
    promise: Promise<T>,
    loading: string,
    success: string,
    error: string
  ) => void
  dismiss: (id?: string | number) => void
}

export function useToast(): UseToastReturn {
  const success = (title: string, message?: string) => {
    toast.success(title, {
      description: message,
    })
  }

  const error = (title: string, message?: string) => {
    toast.error(title, {
      description: message,
    })
  }

  const warning = (title: string, message?: string) => {
    toast.warning(title, {
      description: message,
    })
  }

  const info = (title: string, message?: string) => {
    toast.info(title, {
      description: message,
    })
  }

  const promiseToast = <T>(
    promise: Promise<T>,
    loading: string,
    successMsg: string,
    errorMsg: string
  ) => {
    toast.promise(promise, {
      loading,
      success: successMsg,
      error: errorMsg,
    })
  }

  const dismiss = (id?: string | number) => {
    if (id) {
      toast.dismiss(id)
    } else {
      toast.dismiss()
    }
  }

  return {
    success,
    error,
    warning,
    info,
    promise: promiseToast,
    dismiss,
  }
}