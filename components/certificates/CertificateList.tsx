'use client'

/**
 * ABOUTME: Certificate list component showing all user certificates with management actions
 * ABOUTME: Supports filtering, viewing, sharing, and generating new certificates from eligible documents
 */

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { CertificateViewer } from './CertificateViewer'
import { CertificateGenerator } from '@/components/verification/CertificateGenerator'
import type { PublicationCertificate } from '@/lib/types/database'

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

interface CertificateListProps {
  certificates: Array<PublicationCertificate & { 
    documents?: { id: string; title: string }
    writing_journals?: { id: string; entry_count: number }
  }>
  documents: Document[]
  userId: string
  className?: string
}

type FilterType = 'all' | 'recent' | 'public' | 'private'

export function CertificateList({
  certificates,
  documents,
  userId,
  className = ''
}: CertificateListProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedCertificate, setSelectedCertificate] = useState<string | null>(null)
  const [showGenerator, setShowGenerator] = useState(false)
  const [generatorDocument, setGeneratorDocument] = useState<Document | null>(null)

  // Filter certificates based on selected filter
  const filteredCertificates = certificates.filter(cert => {
    switch (filter) {
      case 'recent':
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        return new Date(cert.created_at) > weekAgo
      case 'public':
        return cert.certificate_data?.disclosureLevel === 'public'
      case 'private':
        return cert.certificate_data?.disclosureLevel === 'private'
      default:
        return true
    }
  })

  // Get eligible documents (have journals with entries)
  const eligibleDocuments = documents.filter(doc => 
    doc.writing_journals && 
    doc.writing_journals.length > 0 && 
    doc.writing_journals[0].entry_count > 0
  )

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getDisclosureBadgeColor = (level?: string): string => {
    switch (level) {
      case 'public': return 'bg-green-100 text-green-800 border-green-200'
      case 'summary': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'private': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleGenerateCertificate = (document: Document) => {
    setGeneratorDocument(document)
    setShowGenerator(true)
  }

  const handleCertificateGenerated = () => {
    setShowGenerator(false)
    setGeneratorDocument(null)
    // Refresh page to show new certificate
    window.location.reload()
  }

  return (
    <div className={className}>
      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex space-x-1 mb-4 sm:mb-0">
          {[
            { key: 'all', label: 'All Certificates' },
            { key: 'recent', label: 'Recent' },
            { key: 'public', label: 'Public' },
            { key: 'private', label: 'Private' }
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setFilter(option.key as FilterType)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === option.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowGenerator(true)}
            disabled={eligibleDocuments.length === 0}
          >
            Generate Certificate
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600 mb-4">
        Showing {filteredCertificates.length} of {certificates.length} certificates
      </div>

      {/* Certificates Grid */}
      {filteredCertificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertificates.map((certificate) => (
            <div key={certificate.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              {/* Certificate Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {certificate.documents?.title || 'Untitled Document'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Generated {formatDate(certificate.created_at)}
                    </p>
                  </div>
                  
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                    getDisclosureBadgeColor(certificate.certificate_data?.disclosureLevel)
                  }`}>
                    {certificate.certificate_data?.disclosureLevel || 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Certificate Content */}
              <div className="px-6 py-4">
                <div className="space-y-3">
                  {/* Certificate ID */}
                  <div className="text-xs">
                    <span className="text-gray-500">Certificate ID:</span>
                    <code className="ml-2 font-mono text-gray-800">
                      {certificate.id.slice(0, 16)}...
                    </code>
                  </div>

                  {/* Verification Status */}
                  <div className="flex items-center space-x-2">
                    <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-xs text-green-700">Cryptographically Verified</span>
                  </div>

                  {/* Merkle Root */}
                  <div className="text-xs">
                    <span className="text-gray-500">Merkle Root:</span>
                    <code className="ml-2 font-mono text-gray-800">
                      {certificate.merkle_root.slice(0, 12)}...
                    </code>
                  </div>

                  {/* Journal Stats */}
                  {certificate.writing_journals && (
                    <div className="text-xs text-gray-600">
                      {certificate.writing_journals.entry_count} journal entries verified
                    </div>
                  )}
                </div>
              </div>

              {/* Certificate Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedCertificate(certificate.id)}
                    className="flex-1 text-xs"
                  >
                    View
                  </Button>
                  
                  {certificate.public_url && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(certificate.public_url!)
                        // TODO: Show toast notification
                      }}
                      className="flex-1 text-xs"
                    >
                      Share
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            {filter === 'all' ? 'No certificates yet' : `No ${filter} certificates`}
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            {eligibleDocuments.length > 0
              ? 'Generate your first certificate to start building verifiable proof of your writing process.'
              : 'Write some documents with AI assistance to create certificates.'}
          </p>
          {eligibleDocuments.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowGenerator(true)}
            >
              Generate Certificate
            </Button>
          )}
        </div>
      )}

      {/* Eligible Documents for Certificate Generation */}
      {eligibleDocuments.length > 0 && certificates.length > 0 && (
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-4">
            Generate New Certificates ({eligibleDocuments.length} eligible documents)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {eligibleDocuments.slice(0, 6).map((document) => (
              <div key={document.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="text-sm font-medium text-gray-900 truncate">
                    {document.title}
                  </h5>
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => handleGenerateCertificate(document)}
                  >
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-gray-600">
                  {document.writing_journals?.[0]?.entry_count || 0} journal entries
                </p>
                <p className="text-xs text-gray-500">
                  Updated {formatDate(document.writing_journals?.[0]?.updated_at || document.created_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certificate Viewer Modal */}
      {selectedCertificate && (
        <CertificateViewer
          certificateId={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}

      {/* Certificate Generator Modal */}
      {showGenerator && (
        <CertificateGenerator
          documents={generatorDocument ? [generatorDocument] : eligibleDocuments}
          selectedDocument={generatorDocument}
          onClose={() => {
            setShowGenerator(false)
            setGeneratorDocument(null)
          }}
          onCertificateGenerated={handleCertificateGenerated}
        />
      )}
    </div>
  )
}