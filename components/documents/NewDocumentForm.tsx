'use client'

/**
 * New Document Form Component
 * Form for creating new documents with validation
 */

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

interface NewDocumentFormData {
  title: string
  metadata: {
    description?: string
    tags?: string[]
    template?: string
  }
}

export function NewDocumentForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<NewDocumentFormData>({
    title: '',
    metadata: {
      description: '',
      tags: [],
      template: 'blank'
    }
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }

    try {
      setCreating(true)
      setError(null)

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          metadata: {
            ...formData.metadata,
            template: formData.metadata.template,
            description: formData.metadata.description || undefined
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create document')
      }

      const { document } = await response.json()
      
      // Redirect to the new document
      router.push(`/dashboard/documents/${document.id}`)

    } catch (err) {
      console.error('Failed to create document:', err)
      setError(err instanceof Error ? err.message : 'Failed to create document')
    } finally {
      setCreating(false)
    }
  }

  // Handle tag input
  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const input = e.currentTarget
      const tag = input.value.trim()
      
      if (tag && !formData.metadata.tags?.includes(tag)) {
        setFormData(prev => ({
          ...prev,
          metadata: {
            ...prev.metadata,
            tags: [...(prev.metadata.tags || []), tag]
          }
        }))
        input.value = ''
      }
    }
  }

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        tags: prev.metadata.tags?.filter(tag => tag !== tagToRemove) || []
      }
    }))
  }

  const templates = [
    { id: 'blank', name: 'Blank Document', description: 'Start with an empty document' },
    { id: 'article', name: 'Article', description: 'Blog post or article format' },
    { id: 'essay', name: 'Essay', description: 'Academic or formal essay structure' },
    { id: 'story', name: 'Story', description: 'Creative writing and storytelling' },
    { id: 'notes', name: 'Notes', description: 'Quick notes and thoughts' }
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Document Title *
        </label>
        <div className="mt-1">
          <input
            type="text"
            id="title"
            name="title"
            required
            placeholder="Enter a title for your document..."
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Give your document a descriptive title. You can change this later.
        </p>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description (Optional)
        </label>
        <div className="mt-1">
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Brief description of what this document is about..."
            value={formData.metadata.description || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              metadata: { ...prev.metadata, description: e.target.value }
            }))}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Template Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Template
        </label>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {templates.map((template) => (
            <div key={template.id} className="relative">
              <input
                type="radio"
                id={template.id}
                name="template"
                value={template.id}
                checked={formData.metadata.template === template.id}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  metadata: { ...prev.metadata, template: e.target.value }
                }))}
                className="sr-only"
              />
              <label
                htmlFor={template.id}
                className={`block p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                  formData.metadata.template === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      formData.metadata.template === template.id
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {formData.metadata.template === template.id && (
                        <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                      )}
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {template.description}
                    </p>
                  </div>
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
          Tags (Optional)
        </label>
        <div className="mt-1">
          <input
            type="text"
            id="tags"
            placeholder="Type a tag and press Enter..."
            onKeyDown={handleTagInput}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {formData.metadata.tags && formData.metadata.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {formData.metadata.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-600 hover:bg-blue-200 hover:text-blue-800"
                >
                  <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                    <path strokeLinecap="round" strokeWidth="1.5" d="m1 1 6 6m0-6-6 6" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="mt-2 text-sm text-gray-500">
          Add tags to help organize and find your documents. Press Enter or comma to add a tag.
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-3 pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={creating || !formData.title.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </>
          ) : (
            'Create Document'
          )}
        </button>
      </div>
    </form>
  )
}