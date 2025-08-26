/**
 * Master Journal Browser Page
 * Shows all journals across all documents for the current user
 */

import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { JournalViewer } from '@/components/journal/JournalViewer'

export default async function JournalsPage() {
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

  // Get all journals for this user
  const { data: journals, error: journalsError } = await supabase
    .from('writing_journals')
    .select(`
      *,
      documents (
        id,
        title,
        created_at
      )
    `)
    .eq('writer_id', user.id)
    .order('updated_at', { ascending: false })

  if (journalsError) {
    console.error('Error fetching journals:', journalsError)
  }

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
              <h1 className="text-xl font-semibold text-gray-900">All Journals</h1>
            </div>
            <div className="flex items-center space-x-4">
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
          {journals && journals.length > 0 ? (
            <JournalViewer 
              journals={journals} 
              mode="all"
              showDocumentContext={true}
            />
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No journals yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start writing documents to build your process journal history.
              </p>
              <div className="mt-6">
                <Link
                  href="/dashboard/documents/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create Document
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}