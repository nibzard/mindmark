'use client'

/**
 * ABOUTME: Recent documents widget showing latest document activity with quick access and status
 * ABOUTME: Displays document titles, last updated times, journal entry counts, and action buttons
 */

import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface RecentDocument {
  id: string
  title: string
  content?: string
  created_at: string
  updated_at: string
  writing_journals?: Array<{
    id: string
    entry_count: number
    updated_at: string
  }>
}

interface RecentDocumentsProps {
  documents: RecentDocument[]
  userId: string
  className?: string
}

export function RecentDocuments({ 
  documents, 
  userId, 
  className = '' 
}: RecentDocumentsProps) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    
    return date.toLocaleDateString()
  }

  const getStatusColor = (document: RecentDocument): string => {
    const hasJournal = document.writing_journals && document.writing_journals.length > 0
    const journalEntries = hasJournal ? document.writing_journals[0].entry_count : 0
    
    if (journalEntries > 10) return 'text-green-600 bg-green-50 border-green-200'
    if (journalEntries > 0) return 'text-blue-600 bg-blue-50 border-blue-200'
    return 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const getStatusText = (document: RecentDocument): string => {
    const hasJournal = document.writing_journals && document.writing_journals.length > 0
    const journalEntries = hasJournal ? document.writing_journals[0].entry_count : 0
    
    if (journalEntries > 10) return 'Active'
    if (journalEntries > 0) return 'In Progress'
    return 'Draft'
  }

  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Recent Documents</h3>
            <p className="text-sm text-gray-500">Your latest writing projects</p>
          </div>
          <Link
            href="/dashboard/documents"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View all →
          </Link>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {documents.length > 0 ? (
          documents.map((document) => {
            const hasJournal = document.writing_journals && document.writing_journals.length > 0
            const journalEntries = hasJournal ? document.writing_journals[0].entry_count : 0
            const lastActivity = hasJournal && document.writing_journals[0].updated_at 
              ? document.writing_journals[0].updated_at 
              : document.updated_at

            return (
              <div key={document.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-3">
                      <Link
                        href={`/dashboard/documents/${document.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate"
                      >
                        {document.title || 'Untitled Document'}
                      </Link>
                      
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(document)}`}>
                        {getStatusText(document)}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                      <span>Updated {formatDate(lastActivity)}</span>
                      
                      {journalEntries > 0 && (
                        <span className="flex items-center">
                          <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          {journalEntries} journal entries
                        </span>
                      )}

                      <span>Created {formatDate(document.created_at)}</span>
                    </div>

                    {/* Document Preview */}
                    {document.content && (
                      <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                        {document.content.substring(0, 120)}
                        {document.content.length > 120 ? '...' : ''}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="ml-4 flex items-center space-x-2">
                    {hasJournal && (
                      <Link
                        href={`/dashboard/documents/${document.id}/journal`}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                        title="View journal"
                      >
                        <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Journal
                      </Link>
                    )}
                    
                    <Link
                      href={`/dashboard/documents/${document.id}`}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                      title="Edit document"
                    >
                      <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No documents yet</h3>
            <p className="text-xs text-gray-500 mb-4">
              Create your first document to start building your writing portfolio
            </p>
            <Link
              href="/dashboard/documents/new"
              className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Document
            </Link>
          </div>
        )}
      </div>

      {/* Footer with action */}
      {documents.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
              Showing {Math.min(documents.length, 5)} of {documents.length} documents
            </span>
            <Link
              href="/dashboard/documents/new"
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            >
              <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Document
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}