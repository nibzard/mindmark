'use client'

/**
 * Document Card Component
 * Displays individual document information in grid or list view
 */

import React, { useState } from 'react'
import Link from 'next/link'

interface Document {
  id: string
  title: string
  content: any
  published: boolean
  published_at: string | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  writing_journals: {
    id: string
    entry_count: number
    privacy_level: string
    last_checkpoint_at: string | null
  }[]
}

interface DocumentCardProps {
  document: Document
  viewMode: 'grid' | 'list'
  onUpdate: () => void
}

export function DocumentCard({ document, viewMode, onUpdate }: DocumentCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const journal = document.writing_journals?.[0]
  
  // Format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return formatDate(dateString)
  }

  // Estimate reading time from content
  const getReadingTime = () => {
    if (!document.content) return 0
    const text = JSON.stringify(document.content)
    const wordCount = text.split(/\s+/).length
    return Math.ceil(wordCount / 200) // Average reading speed
  }

  // Get content preview
  const getContentPreview = () => {
    if (!document.content) return 'No content yet...'
    
    try {
      // Extract text from Lexical editor state
      const textContent = JSON.stringify(document.content)
        .replace(/[{}[\]"]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      
      return textContent.length > 150 
        ? textContent.substring(0, 150) + '...'
        : textContent
    } catch {
      return 'No content yet...'
    }
  }

  // Delete document
  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${document.title}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeleting(true)
      
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }

      onUpdate() // Refresh the list
    } catch (error) {
      console.error('Failed to delete document:', error)
      alert('Failed to delete document. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  // Toggle published status
  const handleTogglePublished = async () => {
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          published: !document.published
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update document')
      }

      onUpdate() // Refresh the list
    } catch (error) {
      console.error('Failed to update document:', error)
      alert('Failed to update document. Please try again.')
    }
  }

  if (viewMode === 'list') {
    return (
      <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <Link
                href={`/dashboard/documents/${document.id}`}
                className="text-lg font-medium text-gray-900 hover:text-blue-600 truncate"
              >
                {document.title}
              </Link>
              {document.published && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Published
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
              {getContentPreview()}
            </p>
            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
              <span>Updated {formatTimeAgo(document.updated_at)}</span>
              {journal && (
                <span>{journal.entry_count} journal entries</span>
              )}
              <span>{getReadingTime()} min read</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <Link
              href={`/dashboard/documents/${document.id}/journal`}
              className="text-gray-400 hover:text-gray-600"
              title="View process journal"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </Link>
            
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              
              {showActions && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                  <div className="py-1">
                    <button
                      onClick={handleTogglePublished}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {document.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <Link
              href={`/dashboard/documents/${document.id}`}
              className="text-lg font-medium text-gray-900 hover:text-blue-600 line-clamp-2"
            >
              {document.title}
            </Link>
            {document.published && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                Published
              </span>
            )}
          </div>
          
          <div className="relative ml-2">
            <button
              onClick={() => setShowActions(!showActions)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            
            {showActions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                <div className="py-1">
                  <button
                    onClick={handleTogglePublished}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {document.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <p className="mt-3 text-sm text-gray-600 line-clamp-3">
          {getContentPreview()}
        </p>
        
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>Updated {formatTimeAgo(document.updated_at)}</span>
          <span>{getReadingTime()} min read</span>
        </div>
        
        {journal && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{journal.entry_count} entries</span>
            </div>
            
            <Link
              href={`/dashboard/documents/${document.id}/journal`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View process →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}