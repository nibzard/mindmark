'use client'

/**
 * ABOUTME: Certificate generation form modal with document selection and privacy options
 * ABOUTME: Handles certificate creation with disclosure level selection and witness type options
 */

import { useState } from 'react'
import { Modal } from '@/components/ui/modal-compat'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { createVerificationService } from '@/lib/services/verification'
import type { CertificateRequest } from '@/lib/services/verification'

interface Document {
  id: string
  title: string
  created_at: string
  writing_journals?: Array<{
    id: string
    entry_count: number
    updated_at: string
  }>
}

interface CertificateGeneratorProps {
  documents: Document[]
  selectedDocument?: Document | null
  onClose: () => void
  onCertificateGenerated: () => void
}

export function CertificateGenerator({
  documents,
  selectedDocument,
  onClose,
  onCertificateGenerated
}: CertificateGeneratorProps) {
  const [formData, setFormData] = useState({
    documentId: selectedDocument?.id || '',
    title: selectedDocument?.title || '',
    authorName: '',
    authorIdentifier: '',
    disclosureLevel: 'summary' as 'private' | 'summary' | 'public',
    witnessType: 'local' as 'arweave' | 'twitter' | 'local'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verificationService = createVerificationService()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Find selected document
      const document = documents.find(d => d.id === formData.documentId)
      if (!document) {
        throw new Error('Selected document not found')
      }

      const journal = document.writing_journals?.[0]
      if (!journal) {
        throw new Error('Document does not have an associated journal')
      }

      // Create certificate request
      const request: CertificateRequest = {
        documentId: formData.documentId,
        journalId: journal.id,
        title: formData.title,
        author: {
          name: formData.authorName,
          identifier: formData.authorIdentifier || undefined
        },
        disclosureLevel: formData.disclosureLevel,
        witnessType: formData.witnessType
      }

      // Generate certificate
      await verificationService.generateCertificate(request)
      
      onCertificateGenerated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate certificate')
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentChange = (documentId: string) => {
    const document = documents.find(d => d.id === documentId)
    setFormData(prev => ({
      ...prev,
      documentId,
      title: document?.title || ''
    }))
  }

  const disclosureOptions = [
    {
      value: 'private',
      label: 'Private',
      description: 'Only proves existence and integrity, no content details revealed'
    },
    {
      value: 'summary',
      label: 'Summary',
      description: 'Includes basic metrics like entry count and timespan, no actual content'
    },
    {
      value: 'public',
      label: 'Public',
      description: 'Full transparency including process details and AI interaction patterns'
    }
  ]

  const witnessOptions = [
    {
      value: 'local',
      label: 'Local Only',
      description: 'Certificate stored locally, verifiable through Mindmark'
    },
    {
      value: 'arweave',
      label: 'Arweave Blockchain',
      description: 'Permanent storage on Arweave blockchain (small fee required)'
    },
    {
      value: 'twitter',
      label: 'Twitter Witness',
      description: 'Public timestamp via Twitter post (requires Twitter connection)'
    }
  ]

  return (
    <Modal isOpen={true} onClose={onClose} size="lg" title="Generate Certificate">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Generate Certificate</h3>
            <p className="text-sm text-gray-500">
              Create a verifiable proof of your writing process
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Document Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Document
            </label>
            <select
              value={formData.documentId}
              onChange={(e) => handleDocumentChange(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a document...</option>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title} ({document.writing_journals?.[0]?.entry_count || 0} entries)
                </option>
              ))}
            </select>
          </div>

          {/* Certificate Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Certificate Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              placeholder="Enter the title for this certificate"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Author Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Author Name *
              </label>
              <input
                type="text"
                value={formData.authorName}
                onChange={(e) => setFormData(prev => ({ ...prev, authorName: e.target.value }))}
                required
                placeholder="Your full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Author Identifier (optional)
              </label>
              <input
                type="text"
                value={formData.authorIdentifier}
                onChange={(e) => setFormData(prev => ({ ...prev, authorIdentifier: e.target.value }))}
                placeholder="ORCID, email, or other identifier"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Disclosure Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Disclosure Level
            </label>
            <div className="space-y-3">
              {disclosureOptions.map((option) => (
                <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="disclosureLevel"
                    value={option.value}
                    checked={formData.disclosureLevel === option.value}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      disclosureLevel: e.target.value as any 
                    }))}
                    className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-600">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Witness Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Verification Method
            </label>
            <div className="space-y-3">
              {witnessOptions.map((option) => (
                <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="witnessType"
                    value={option.value}
                    checked={formData.witnessType === option.value}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      witnessType: e.target.value as any 
                    }))}
                    className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-600">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Generation Failed</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="default" 
              disabled={loading || !formData.documentId || !formData.authorName}
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Generating...
                </>
              ) : (
                'Generate Certificate'
              )}
            </Button>
          </div>
        </form>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-900">Certificate Generation</h4>
              <p className="text-xs text-blue-700 mt-1">
                This process creates a cryptographic proof of your writing process using Merkle tree hashing. 
                The certificate includes verification hashes but never exposes the actual content of your private journal entries.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}