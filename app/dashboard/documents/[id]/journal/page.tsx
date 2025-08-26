/**
 * Individual Document Journal Viewer Page
 * Shows the complete writing process journal for a specific document
 */

import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { JournalViewer } from '@/components/journal/JournalViewer'

interface JournalPageProps {
  params: {
    id: string
  }
}

export default async function DocumentJournalPage({ params }: JournalPageProps) {
  const supabase = await createSupabaseServerClient()
  
  // Check authentication
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth/login')
  }

  // Get document with associated journal
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select(`
      *,
      writing_journals (
        id,
        privacy_level,
        entry_count,
        created_at,
        updated_at
      )
    `)
    .eq('id', params.id)
    .eq('writer_id', user.id)
    .single()

  if (docError || !document) {
    notFound()
  }

  // Get the journal for this document
  const journal = document.writing_journals?.[0]

  if (!journal) {
    // Document exists but no journal yet - this could happen with older documents
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link href={`/dashboard/documents/${params.id}`} className="text-blue-600 hover:text-blue-800 mr-4">
                  ← Back to Document
                </Link>
                <h1 className="text-xl font-semibold text-gray-900">Journal</h1>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No journal available</h3>
            <p className="mt-1 text-sm text-gray-500">
              This document doesn't have an associated writing journal yet.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Get writer profile for display
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
              <Link href={`/dashboard/documents/${params.id}`} className="text-blue-600 hover:text-blue-800 mr-4">
                ← Back to Document
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Writing Journal</h1>
                <p className="text-sm text-gray-600">{document.title}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right text-sm">
                <div className="text-gray-900">
                  {journal.entry_count} entries
                </div>
                <div className="text-gray-500">
                  Started {new Date(journal.created_at).toLocaleDateString()}
                </div>
              </div>
              <Link
                href="/dashboard/journals"
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                All Journals
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
          <JournalViewer 
            journals={[{ ...journal, documents: document }]} 
            mode="single"
            showDocumentContext={false}
            documentTitle={document.title}
          />
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: JournalPageProps) {
  const supabase = await createSupabaseServerClient()
  
  const { data: document } = await supabase
    .from('documents')
    .select('title')
    .eq('id', params.id)
    .single()

  return {
    title: `Journal - ${document?.title || 'Document'} | Mindmark`,
    description: 'View the complete writing process journal for this document'
  }
}