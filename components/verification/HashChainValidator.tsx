'use client'

/**
 * ABOUTME: Hash chain integrity validation display component with visual status indicators
 * ABOUTME: Shows validation results, chain health metrics, and detailed error information
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
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
                  <><svg className=\"h-3 w-3 mr-1\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">
                    <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M9 12l2 2 4-4\" />
                  </svg>Valid</>
                ) : (
                  <><svg className=\"h-3 w-3 mr-1\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">
                    <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M6 18L18 6M6 6l12 12\" />
                  </svg>Invalid</>
                )}\n              </div>\n            )}\n          </div>\n          <div className=\"flex items-center space-x-2\">\n            <Button\n              variant=\"secondary\"\n              size=\"xs\"\n              onClick={validateChain}\n              disabled={loading}\n            >\n              {loading ? 'Validating...' : 'Re-validate'}\n            </Button>\n            {result && (\n              <button\n                onClick={() => setExpanded(!expanded)}\n                className=\"text-gray-400 hover:text-gray-600\"\n              >\n                <svg\n                  className={`h-4 w-4 transform transition-transform ${\n                    expanded ? 'rotate-180' : ''\n                  }`}\n                  fill=\"none\"\n                  viewBox=\"0 0 24 24\"\n                  stroke=\"currentColor\"\n                >\n                  <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M19 9l-7 7-7-7\" />\n                </svg>\n              </button>\n            )}\n          </div>\n        </div>\n      </div>\n\n      {/* Content */}\n      <div className=\"p-4\">\n        {loading ? (\n          <div className=\"flex items-center justify-center py-8\">\n            <LoadingSpinner size=\"md\" className=\"mr-2\" />\n            <span className=\"text-sm text-gray-600\">Validating hash chain...</span>\n          </div>\n        ) : result ? (\n          <div className=\"space-y-4\">\n            {/* Summary Stats */}\n            <div className=\"grid grid-cols-2 md:grid-cols-3 gap-4\">\n              <div className=\"text-center p-3 bg-gray-50 rounded-lg\">\n                <div className=\"text-lg font-semibold text-gray-900\">\n                  {result.validatedEntries}/{result.totalEntries}\n                </div>\n                <div className=\"text-xs text-gray-600\">Validated Entries</div>\n              </div>\n              \n              <div className=\"text-center p-3 bg-gray-50 rounded-lg\">\n                <div className=\"text-lg font-semibold text-gray-900\">\n                  {result.summary.checkpointCount}\n                </div>\n                <div className=\"text-xs text-gray-600\">Checkpoints</div>\n              </div>\n              \n              <div className=\"text-center p-3 bg-gray-50 rounded-lg\">\n                <div className={`text-lg font-semibold ${\n                  result.isValid ? 'text-green-600' : 'text-red-600'\n                }`}>\n                  {result.isValid ? '100%' : '0%'}\n                </div>\n                <div className=\"text-xs text-gray-600\">Integrity</div>\n              </div>\n            </div>\n\n            {/* Status Message */}\n            <div className={`p-4 rounded-lg ${\n              result.isValid \n                ? 'bg-green-50 border border-green-200'\n                : 'bg-red-50 border border-red-200'\n            }`}>\n              <div className=\"flex items-start space-x-2\">\n                <svg className={`h-5 w-5 mt-0.5 ${\n                  result.isValid ? 'text-green-500' : 'text-red-500'\n                }`} fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n                  {result.isValid ? (\n                    <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z\" />\n                  ) : (\n                    <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z\" />\n                  )}\n                </svg>\n                <div>\n                  <h4 className={`text-sm font-medium ${\n                    result.isValid ? 'text-green-800' : 'text-red-800'\n                  }`}>\n                    {result.isValid ? 'Hash Chain Validated' : 'Hash Chain Invalid'}\n                  </h4>\n                  <p className={`text-xs mt-1 ${\n                    result.isValid ? 'text-green-700' : 'text-red-700'\n                  }`}>\n                    {result.isValid \n                      ? 'All journal entries are cryptographically linked and verified. The writing process integrity is confirmed.'\n                      : 'The hash chain validation failed. This indicates potential tampering or corruption in the journal entries.'\n                    }\n                  </p>\n                </div>\n              </div>\n            </div>\n\n            {/* Error Details */}\n            {result.errors && result.errors.length > 0 && (\n              <div className=\"bg-red-50 border border-red-200 rounded-lg p-4\">\n                <h4 className=\"text-sm font-medium text-red-800 mb-2\">Validation Errors:</h4>\n                <ul className=\"text-xs text-red-700 space-y-1\">\n                  {result.errors.map((error, index) => (\n                    <li key={index}>• {error}</li>\n                  ))}\n                </ul>\n              </div>\n            )}\n\n            {/* Detailed Information */}\n            {expanded && (\n              <div className=\"space-y-4 pt-4 border-t border-gray-200\">\n                <h4 className=\"text-sm font-medium text-gray-900\">Technical Details</h4>\n                \n                <div className=\"space-y-3 text-xs\">\n                  <div>\n                    <span className=\"font-medium text-gray-700\">Journal ID:</span>\n                    <code className=\"ml-2 px-2 py-1 bg-gray-100 rounded font-mono\">\n                      {journalId}\n                    </code>\n                  </div>\n                  \n                  {result.summary.firstHash && (\n                    <div>\n                      <span className=\"font-medium text-gray-700\">First Entry Hash:</span>\n                      <code className=\"ml-2 px-2 py-1 bg-gray-100 rounded font-mono break-all\">\n                        {result.summary.firstHash}\n                      </code>\n                    </div>\n                  )}\n                  \n                  {result.summary.lastHash && (\n                    <div>\n                      <span className=\"font-medium text-gray-700\">Last Entry Hash:</span>\n                      <code className=\"ml-2 px-2 py-1 bg-gray-100 rounded font-mono break-all\">\n                        {result.summary.lastHash}\n                      </code>\n                    </div>\n                  )}\n                </div>\n                \n                <div className=\"bg-blue-50 border border-blue-200 rounded-lg p-3\">\n                  <h5 className=\"text-xs font-medium text-blue-900 mb-1\">How Hash Chain Validation Works</h5>\n                  <p className=\"text-xs text-blue-800\">\n                    Each journal entry contains a hash of its content and a hash that links to the previous entry. \n                    This creates an immutable chain where any modification would break the cryptographic links, \n                    ensuring the integrity of your writing process history.\n                  </p>\n                </div>\n              </div>\n            )}\n          </div>\n        ) : (\n          <div className=\"text-center py-4 text-gray-500\">\n            <p className=\"text-sm\">Click \"Validate\" to check hash chain integrity</p>\n          </div>\n        )}\n      </div>\n    </div>\n  )\n}"