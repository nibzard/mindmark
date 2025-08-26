'use client'

/**
 * Document Editor Component
 * Full-featured document editing interface with AI integration and journal capture
 */

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { LexicalEditor } from '@/components/editor/LexicalEditor'
import { AICommandPalette } from '@/components/editor/AICommandPalette'

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
    summary?: string
    last_checkpoint_at: string | null
  }[]
}

interface Writer {
  id: string
  username: string | null
  display_name: string | null
  settings: Record<string, any>
}

interface DocumentEditorProps {
  document: Document
  writer: Writer | null
}

export function DocumentEditor({ document, writer }: DocumentEditorProps) {
  const [currentDocument, setCurrentDocument] = useState(document)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showJournal, setShowJournal] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)

  const journal = currentDocument.writing_journals?.[0]

  // Auto-save document
  const handleSave = async (content: any) => {
    try {
      setSaving(true)
      
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save document')
      }

      const { document: updatedDoc } = await response.json()
      setCurrentDocument(updatedDoc)
      setLastSaved(new Date())

    } catch (error) {
      console.error('Save failed:', error)
      // Could show a toast notification here
    } finally {
      setSaving(false)
    }
  }

  // Handle content changes
  const handleContentChange = (content: any, words: number, chars: number) => {
    setWordCount(words)
    setCharCount(chars)
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
          published: !currentDocument.published
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update document')
      }

      const { document: updatedDoc } = await response.json()
      setCurrentDocument(updatedDoc)

    } catch (error) {
      console.error('Failed to update document:', error)
    }
  }

  // Format last saved time
  const formatLastSaved = () => {
    if (!lastSaved) return null
    
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - lastSaved.getTime()) / 1000)
    
    if (diffInSeconds < 10) return 'Just saved'
    if (diffInSeconds < 60) return `Saved ${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `Saved ${Math.floor(diffInSeconds / 60)}m ago`
    return `Saved at ${lastSaved.toLocaleTimeString()}`
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Navigation and title */}
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <Link
                href="/dashboard/documents"
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold text-gray-900 truncate">
                  {currentDocument.title}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{wordCount} words</span>
                  <span>{charCount} characters</span>
                  {lastSaved && (
                    <span className="text-green-600">
                      {formatLastSaved()}
                    </span>
                  )}
                  {saving && (
                    <span className="text-blue-600">
                      Saving...
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-4">
              {/* Journal toggle */}
              <button
                onClick={() => setShowJournal(!showJournal)}
                className={`p-2 rounded-md text-sm font-medium ${
                  showJournal
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Toggle process journal"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>

              {/* Published status */}
              <button
                onClick={handleTogglePublished}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  currentDocument.published
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {currentDocument.published ? 'Published' : 'Draft'}
              </button>

              {/* User info */}
              <span className="text-sm text-gray-700">
                {writer?.display_name || writer?.username || 'User'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex">
        {/* Editor */}
        <div className={`flex-1 ${showJournal ? 'pr-4' : ''}`}>
          <div className="max-w-4xl mx-auto p-6">
            <LexicalEditor
              documentId={document.id}
              initialContent={currentDocument.content}
              placeholder="Start writing your document..."
              autoSave={true}
              autoSaveDelay={2000}
              onSave={handleSave}
              onChange={handleContentChange}
              className="min-h-screen"
            />

            {/* AI Command Palette */}
            <AICommandPalette
              documentId={document.id}
              journalId={journal?.id}
            />
          </div>
        </div>

        {/* Journal Sidebar */}
        {showJournal && (
          <div className="w-96 bg-gray-50 border-l border-gray-200 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Process Journal</h2>
                <button
                  onClick={() => setShowJournal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {journal && (
                <div className="space-y-4">
                  {/* Journal stats */}
                  <div className="bg-white rounded-lg p-4 border">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Writing Process</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Entries:</span>
                        <span className="font-medium">{journal.entry_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Privacy:</span>
                        <span className="font-medium capitalize">{journal.privacy_level}</span>
                      </div>
                      {journal.last_checkpoint_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Last checkpoint:</span>
                          <span className="font-medium">
                            {new Date(journal.last_checkpoint_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  {journal.summary && (
                    <div className="bg-white rounded-lg p-4 border">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Process Summary</h3>
                      <p className="text-sm text-gray-600">{journal.summary}</p>
                    </div>
                  )}

                  {/* View full journal */}
                  <div className="bg-white rounded-lg p-4 border">
                    <Link
                      href={`/dashboard/documents/${document.id}/journal`}
                      className="block text-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Full Process Journal →
                    </Link>
                  </div>

                  {/* Quick actions */}
                  <div className="bg-white rounded-lg p-4 border">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Quick Actions</h3>
                    <div className="space-y-2">
                      <button className="w-full text-left text-sm text-gray-600 hover:text-gray-900 py-1">
                        Add annotation
                      </button>
                      <button className="w-full text-left text-sm text-gray-600 hover:text-gray-900 py-1">
                        Record decision
                      </button>
                      <button className="w-full text-left text-sm text-gray-600 hover:text-gray-900 py-1">
                        Generate checkpoint
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}