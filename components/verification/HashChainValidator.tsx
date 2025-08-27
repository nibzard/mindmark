'use client'

/**
 * ABOUTME: Hash chain integrity validation display component with visual status indicators
 * ABOUTME: Shows validation results, chain health metrics, and detailed error information
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { createJournalService } from '@/lib/services/journal'

interface HashChainValidatorProps {
  journalId: string
  showDetails?: boolean
  className?: string
}

interface ValidationResult {
  isValid: boolean
  totalEntries: number
  validatedEntries: number
  errors?: string[]
  summary: {
    firstHash: string
    lastHash: string
    checkpointCount: number
  }
}

export function HashChainValidator({
  journalId,
  showDetails = false,
  className = ''
}: HashChainValidatorProps) {
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(showDetails)

  const journalService = createJournalService()

  const validateChain = async () => {
    if (!journalId) return
    
    setLoading(true)
    try {
      const [isValid, summary] = await Promise.all([
        journalService.validateHashChain(journalId),
        journalService.getHashChainSummary(journalId)
      ])

      setResult({
        isValid,
        totalEntries: summary.totalEntries,
        validatedEntries: isValid ? summary.totalEntries : 0,
        summary: {
          firstHash: summary.firstHash,
          lastHash: summary.lastHash,
          checkpointCount: summary.checkpointCount
        },
        errors: isValid ? undefined : ['Hash chain validation failed - integrity compromised']
      })
    } catch (error) {
      setResult({
        isValid: false,
        totalEntries: 0,
        validatedEntries: 0,
        summary: {
          firstHash: '',
          lastHash: '',
          checkpointCount: 0
        },
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (journalId) {
      validateChain()
    }
  }, [journalId])

  if (!journalId) {
    return (
      <div className={`text-center py-4 text-gray-500 ${className}`}>
        <p className="text-sm">No journal ID provided for validation</p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-sm font-medium text-gray-900">Hash Chain Validation</h3>
            {result && (
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                result.isValid 
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {result.isValid ? (
                  <>
                    <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                    </svg>
                    Valid
                  </>
                ) : (
                  <>
                    <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Invalid
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={validateChain}
              disabled={loading}
            >
              {loading ? 'Validating...' : 'Re-validate'}
            </Button>
            {result && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className={`h-4 w-4 transform transition-transform ${
                    expanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" className="mr-2" />
            <span className="text-sm text-gray-600">Validating hash chain...</span>
          </div>
        ) : result ? (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-gray-900">
                  {result.validatedEntries}/{result.totalEntries}
                </div>
                <div className="text-xs text-gray-600">Validated Entries</div>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-gray-900">
                  {result.summary.checkpointCount}
                </div>
                <div className="text-xs text-gray-600">Checkpoints</div>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className={`text-lg font-semibold ${
                  result.isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.isValid ? '100%' : '0%'}
                </div>
                <div className="text-xs text-gray-600">Integrity</div>
              </div>
            </div>

            {/* Status Message */}
            <div className={`p-4 rounded-lg ${
              result.isValid 
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start space-x-2">
                <svg className={`h-5 w-5 mt-0.5 ${
                  result.isValid ? 'text-green-500' : 'text-red-500'
                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {result.isValid ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                <div>
                  <h4 className={`text-sm font-medium ${
                    result.isValid ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.isValid ? 'Hash Chain Validated' : 'Hash Chain Invalid'}
                  </h4>
                  <p className={`text-xs mt-1 ${
                    result.isValid ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {result.isValid 
                      ? 'All journal entries are cryptographically linked and verified. The writing process integrity is confirmed.'
                      : 'The hash chain validation failed. This indicates potential tampering or corruption in the journal entries.'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Error Details */}
            {result.errors && result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-800 mb-2">Validation Errors:</h4>
                <ul className="text-xs text-red-700 space-y-1">
                  {result.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detailed Information */}
            {expanded && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900">Technical Details</h4>
                
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="font-medium text-gray-700">Journal ID:</span>
                    <code className="ml-2 px-2 py-1 bg-gray-100 rounded font-mono">
                      {journalId}
                    </code>
                  </div>
                  
                  {result.summary.firstHash && (
                    <div>
                      <span className="font-medium text-gray-700">First Entry Hash:</span>
                      <code className="ml-2 px-2 py-1 bg-gray-100 rounded font-mono break-all">
                        {result.summary.firstHash}
                      </code>
                    </div>
                  )}
                  
                  {result.summary.lastHash && (
                    <div>
                      <span className="font-medium text-gray-700">Last Entry Hash:</span>
                      <code className="ml-2 px-2 py-1 bg-gray-100 rounded font-mono break-all">
                        {result.summary.lastHash}
                      </code>
                    </div>
                  )}
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h5 className="text-xs font-medium text-blue-900 mb-1">How Hash Chain Validation Works</h5>
                  <p className="text-xs text-blue-800">
                    Each journal entry contains a hash of its content and a hash that links to the previous entry. 
                    This creates an immutable chain where any modification would break the cryptographic links, 
                    ensuring the integrity of your writing process history.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">Click "Validate" to check hash chain integrity</p>
          </div>
        )}
      </div>
    </div>
  )
}