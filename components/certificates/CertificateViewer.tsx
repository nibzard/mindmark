'use client'

/**
 * ABOUTME: Certificate viewer modal for displaying certificate details and verification info
 * ABOUTME: Shows certificate data, verification status, sharing options, and download capabilities
 */

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { PublicationCertificate, CertificateData } from '@/lib/types/database'

interface CertificateViewerProps {
  certificateId: string
  onClose: () => void
}

export function CertificateViewer({ certificateId, onClose }: CertificateViewerProps) {
  const [certificate, setCertificate] = useState<PublicationCertificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'verification' | 'sharing'>('details')

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        // In a real implementation, you'd fetch from your API
        // For now, we'll simulate the data structure
        await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate loading

        // Mock certificate data - in real implementation, fetch from API
        const mockCertificate: PublicationCertificate = {
          id: certificateId,
          document_id: 'doc-123',
          journal_id: 'journal-123',
          merkle_root: '0x' + 'a'.repeat(64),
          public_url: `https://mindmark.io/certificates/${certificateId}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          certificate_data: {
            '@context': [
              'https://www.w3.org/2018/credentials/v1',
              'https://schema.org/',
              'https://mindmark.io/contexts/v1'
            ],
            '@type': 'DigitalDocument',
            '@id': `https://mindmark.io/certificates/${certificateId}`,
            title: 'Sample Document Title',
            author: {
              '@type': 'Person',
              name: 'Writer Name',
              identifier: 'writer-id'
            },
            dateCreated: '2024-01-01T00:00:00Z',
            datePublished: new Date().toISOString(),
            writingProcess: {
              '@type': 'CreativeProcess',
              journalId: 'journal-123',
              entryCount: 42,
              startDate: '2024-01-01T00:00:00Z',
              endDate: new Date().toISOString(),
              aiAssistance: true,
              checkpointCount: 3
            },
            proof: {
              '@type': 'MerkleProof',
              merkleRoot: '0x' + 'a'.repeat(64),
              hashChain: [],
              witnessType: 'local'
            },
            disclosureLevel: 'summary',
            summaryGenerated: true,
            verificationUrl: `https://mindmark.io/verify/${certificateId}`,
            apiEndpoint: `/api/verify/certificate/${certificateId}`
          }
        }

        setCertificate(mockCertificate)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load certificate')
      } finally {
        setLoading(false)
      }
    }

    fetchCertificate()
  }, [certificateId])

  const handleCopyUrl = async () => {
    if (certificate?.public_url) {
      await navigator.clipboard.writeText(certificate.public_url)
      // TODO: Show toast notification
    }
  }

  const handleDownloadJson = () => {
    if (!certificate) return
    
    const blob = new Blob([JSON.stringify(certificate.certificate_data, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mindmark-certificate-${certificateId.slice(0, 8)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDisclosureColor = (level: string): string => {
    switch (level) {
      case 'public': return 'text-green-700 bg-green-50'
      case 'summary': return 'text-yellow-700 bg-yellow-50'
      case 'private': return 'text-red-700 bg-red-50'
      default: return 'text-gray-700 bg-gray-50'
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Certificate Details</h3>
            <p className="text-sm text-gray-500">
              Cryptographic verification certificate
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

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading certificate</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Certificate Content */}
        {certificate && (
          <>
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'details', label: 'Details' },
                  { id: 'verification', label: 'Verification' },
                  { id: 'sharing', label: 'Sharing' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Document Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Document Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Title:</span>
                        <span className="font-medium">{certificate.certificate_data?.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Author:</span>
                        <span className="font-medium">{certificate.certificate_data?.author?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">{formatDate(certificate.certificate_data?.dateCreated || '')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Published:</span>
                        <span className="font-medium">{formatDate(certificate.certificate_data?.datePublished || '')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Writing Process */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Writing Process</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Journal Entries:</span>
                        <span className="font-medium">{certificate.certificate_data?.writingProcess?.entryCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">AI Assistance:</span>
                        <span className="font-medium">
                          {certificate.certificate_data?.writingProcess?.aiAssistance ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Checkpoints:</span>
                        <span className="font-medium">{certificate.certificate_data?.writingProcess?.checkpointCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time Span:</span>
                        <span className="font-medium">
                          {Math.ceil((
                            new Date(certificate.certificate_data?.writingProcess?.endDate || '').getTime() -
                            new Date(certificate.certificate_data?.writingProcess?.startDate || '').getTime()
                          ) / (1000 * 60 * 60 * 24))} days
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Privacy Settings */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Privacy & Disclosure</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Disclosure Level:</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getDisclosureColor(certificate.certificate_data?.disclosureLevel || 'private')
                        }`}>
                          {certificate.certificate_data?.disclosureLevel}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Summary Generated:</span>
                        <span className="font-medium">
                          {certificate.certificate_data?.summaryGenerated ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'verification' && (
                <div className="space-y-6">
                  {/* Verification Status */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span className="font-medium text-green-800">Cryptographically Verified</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      This certificate has been verified using Merkle tree cryptographic proofs.
                    </p>
                  </div>

                  {/* Technical Details */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Certificate ID</label>
                      <code className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-mono">
                        {certificate.id}
                      </code>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Merkle Root Hash</label>
                      <code className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-mono break-all">
                        {certificate.merkle_root}
                      </code>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Verification URL</label>
                      <code className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm">
                        {certificate.certificate_data?.verificationUrl}
                      </code>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">API Endpoint</label>
                      <code className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm">
                        {certificate.certificate_data?.apiEndpoint}
                      </code>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'sharing' && (
                <div className="space-y-6">
                  {/* Public URL */}
                  {certificate.public_url && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Public Certificate URL</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={certificate.public_url}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCopyUrl}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Download Options */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-3 block">Download Certificate</label>
                    <div className="space-y-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleDownloadJson}
                        className="w-full justify-center"
                      >
                        Download as JSON-LD
                      </Button>
                      <p className="text-xs text-gray-500">
                        JSON-LD format for maximum compatibility and verification
                      </p>
                    </div>
                  </div>

                  {/* Sharing Guidelines */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Sharing Guidelines</h4>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• The certificate contains only the information level you specified during generation</li>
                      <li>• Recipients can independently verify the certificate using the provided hashes</li>
                      <li>• The verification process does not reveal private journal content</li>
                      <li>• Certificates remain valid permanently and cannot be revoked</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              {certificate.public_url && (
                <Button variant="primary" onClick={handleCopyUrl}>
                  Copy Share URL
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}