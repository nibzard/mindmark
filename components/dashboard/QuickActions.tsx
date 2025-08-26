'use client'

/**
 * ABOUTME: Quick action buttons for common operations from the dashboard
 * ABOUTME: Provides fast access to create documents, browse journals, generate certificates, and view analytics
 */

import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface QuickActionsProps {
  userId: string
  className?: string
}

const actions = [
  {
    title: 'Create Document',
    description: 'Start a new writing project with automatic journal capture',
    href: '/dashboard/documents/new',
    icon: '📝',
    color: 'bg-blue-600 hover:bg-blue-700',
    textColor: 'text-white'
  },
  {
    title: 'Browse Journals',
    description: 'Explore your writing process history and insights',
    href: '/dashboard/journals',
    icon: '📚',
    color: 'bg-green-600 hover:bg-green-700',
    textColor: 'text-white'
  },
  {
    title: 'View Documents',
    description: 'Access all your writing projects and continue where you left off',
    href: '/dashboard/documents',
    icon: '📄',
    color: 'bg-purple-600 hover:bg-purple-700',
    textColor: 'text-white'
  },
  {
    title: 'Generate Certificate',
    description: 'Create verifiable proof of your writing process',
    href: '/dashboard/certificates',
    icon: '🏆',
    color: 'bg-yellow-600 hover:bg-yellow-700',
    textColor: 'text-white'
  }
]

export function QuickActions({ userId, className = '' }: QuickActionsProps) {
  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        <p className="text-sm text-gray-500">Common tasks and shortcuts</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {actions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="group relative overflow-hidden rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-gray-300"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg group-hover:bg-gray-200 transition-colors">
                    {action.icon}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                    {action.title}
                  </h4>
                  <p className="mt-1 text-xs text-gray-500 group-hover:text-gray-600">
                    {action.description}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-gray-400 group-hover:text-gray-500 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Additional Actions */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/journals"
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              🔍 Search Journals
            </Link>
            <Link
              href="/dashboard/documents?filter=recent"
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              ⏱️ Recent Activity
            </Link>
            <Link
              href="/dashboard/certificates"
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              🔒 My Certificates
            </Link>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 pt-6 border-t border-gray-200 bg-blue-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900">Getting Started</h4>
              <p className="mt-1 text-xs text-blue-700">
                Create your first document to start building your verified writing journal. 
                Every AI interaction and revision is automatically captured for later verification.
              </p>
              <div className="mt-3">
                <Link
                  href="/dashboard/documents/new"
                  className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-500"
                >
                  Create your first document
                  <svg className="ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}