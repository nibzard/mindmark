import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { RecentDocuments } from '@/components/dashboard/RecentDocuments'
import { WritingStats } from '@/components/dashboard/WritingStats'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { JournalOverview } from '@/components/dashboard/JournalOverview'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  
  // Get current user
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

  // Get recent documents with journals
  const { data: recentDocuments } = await supabase
    .from('documents')
    .select(`
      *,
      writing_journals (
        id,
        entry_count,
        updated_at
      )
    `)
    .eq('writer_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(5)

  // Get overall stats
  const { data: allDocuments, count: documentCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('writer_id', user.id)

  const { data: allJournals, count: journalCount } = await supabase
    .from('writing_journals')
    .select('entry_count', { count: 'exact' })
    .eq('writer_id', user.id)

  const totalEntries = allJournals?.reduce((sum, j) => sum + (j.entry_count || 0), 0) || 0

  // Get recent journal activity
  const { data: recentJournalActivity } = await supabase
    .from('writing_journals')
    .select(`
      id,
      entry_count,
      updated_at,
      documents (
        id,
        title
      )
    `)
    .eq('writer_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(5)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Mindmark Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {writer?.display_name || writer?.username || user.email}
              </span>
              <form action="/auth/signout" method="post">
                <button 
                  type="submit"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back, {writer?.display_name || writer?.username || 'Writer'}
            </h2>
            <p className="text-gray-600">
              Your AI-native writing platform with process verification
            </p>
          </div>

          {/* Stats Overview */}
          <div className="mb-8">
            <WritingStats
              documentCount={documentCount || 0}
              journalCount={journalCount || 0}
              totalEntries={totalEntries}
              userId={user.id}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-8">
              {/* Quick Actions */}
              <QuickActions userId={user.id} />
              
              {/* Recent Documents */}
              <RecentDocuments 
                documents={recentDocuments || []}
                userId={user.id}
              />
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {/* Journal Overview */}
              <JournalOverview 
                recentActivity={recentJournalActivity || []}
                userId={user.id}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}