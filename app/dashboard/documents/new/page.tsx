/**
 * New Document Creation Page
 * Form to create a new document with automatic journal initialization
 */

import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { NewDocumentForm } from '@/components/documents/NewDocumentForm'

export default async function NewDocumentPage() {
  const supabase = await createSupabaseServerClient()
  
  // Check authentication
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth/login')
  }

  // Get writer profile
  const { data: writer } = await supabase
    .from('writers')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard/documents" className="text-blue-600 hover:text-blue-800 mr-4">
                ← Documents
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Create New Document</h1>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700">
                {writer?.display_name || writer?.username || user.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Information Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Process Journaling Enabled
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    This document will automatically capture your writing process, including AI interactions, 
                    revisions, and creative decisions. All entries are cryptographically verified with hash chains 
                    for immutable proof of your creative work.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Document Creation Form */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Document Details</h2>
              <p className="mt-1 text-sm text-gray-600">
                Start by giving your document a title. You can begin writing immediately after creation.
              </p>
            </div>
            
            <div className="px-6 py-6">
              <NewDocumentForm />
            </div>
          </div>

          {/* Features Information */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-semibold text-gray-900">AI Integration</h3>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Use Cmd+K to access AI assistance. Every interaction is automatically journaled.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-semibold text-gray-900">Cryptographic Proof</h3>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Hash chains ensure your creative process cannot be forged or tampered with.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-semibold text-gray-900">Share Verification</h3>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Generate certificates to prove your creative process while protecting privacy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}