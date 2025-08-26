/**
 * Certificate Management Page
 * Shows all generated certificates with actions to view, verify, and share
 */

import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CertificateList } from '@/components/certificates/CertificateList'

export default async function CertificatesPage() {
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

  // Get all certificates for this user
  const { data: certificates, error: certsError } = await supabase
    .from('publication_certificates')
    .select(`
      *,
      documents (
        id,
        title
      ),
      writing_journals (
        id,
        entry_count
      )
    `)
    .order('created_at', { ascending: false })

  if (certsError) {
    console.error('Error fetching certificates:', certsError)
  }

  // Get user's documents for certificate generation
  const { data: documents } = await supabase
    .from('documents')
    .select(`
      id,
      title,
      created_at,
      writing_journals (
        id,
        entry_count,
        updated_at
      )
    `)
    .eq('writer_id', user.id)
    .order('updated_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 mr-4">
                ← Dashboard
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Certificates</h1>
                <p className="text-sm text-gray-600">Manage your writing process certificates</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right text-sm">
                <div className="text-gray-900">
                  {certificates?.length || 0} certificates
                </div>
                <div className="text-gray-500">
                  {documents?.length || 0} eligible documents
                </div>
              </div>
              <Link
                href="/dashboard/documents"
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                My Documents
              </Link>
              <span className="text-sm text-gray-700">
                {writer?.display_name || writer?.username || user.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-900">About Writing Process Certificates</h3>
                <p className="mt-1 text-xs text-blue-700">
                  Certificates provide cryptographic proof of your writing process, including AI interactions, 
                  revisions, and creative decisions. They can be shared publicly while maintaining control 
                  over what details are revealed.
                </p>
              </div>
            </div>
          </div>

          <CertificateList
            certificates={certificates || []}
            documents={documents || []}
            userId={user.id}
          />
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata() {
  return {
    title: 'Certificates | Mindmark',
    description: 'Manage your writing process verification certificates'
  }
}