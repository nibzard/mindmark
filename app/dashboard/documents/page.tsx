/**
 * Documents List Page
 * Shows all documents for the current user
 */

import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DocumentList } from '@/components/documents/DocumentList'

export default async function DocumentsPage() {
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
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 mr-4">
                ← Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">My Documents</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/documents/new"
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                New Document
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
          <DocumentList />
        </div>
      </div>
    </div>
  )
}