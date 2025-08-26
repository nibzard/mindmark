'use client'

/**
 * ABOUTME: Journal activity overview widget showing recent journal activity and writing patterns
 * ABOUTME: Displays recent journal updates, entry counts, and quick access to journal viewing
 */

import Link from 'next/link'
import { JournalStats } from '@/components/journal/JournalStats'

interface JournalActivity {
  id: string
  entry_count: number
  updated_at: string
  documents?: {
    id: string
    title: string
  }
}

interface JournalOverviewProps {
  recentActivity: JournalActivity[]
  userId: string
  className?: string
}

export function JournalOverview({ 
  recentActivity, 
  userId, 
  className = '' 
}: JournalOverviewProps) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    
    return date.toLocaleDateString()
  }

  const getActivityLevel = (entryCount: number): { color: string; label: string; icon: string } => {
    if (entryCount >= 20) {
      return { color: 'text-green-600 bg-green-50 border-green-200', label: 'Very Active', icon: '🔥' }
    } else if (entryCount >= 10) {
      return { color: 'text-blue-600 bg-blue-50 border-blue-200', label: 'Active', icon: '⚡' }
    } else if (entryCount >= 5) {
      return { color: 'text-yellow-600 bg-yellow-50 border-yellow-200', label: 'Moderate', icon: '📝' }
    } else if (entryCount > 0) {
      return { color: 'text-gray-600 bg-gray-50 border-gray-200', label: 'Getting Started', icon: '🌱' }
    } else {
      return { color: 'text-gray-400 bg-gray-50 border-gray-200', label: 'New', icon: '📄' }
    }
  }

  // Calculate summary stats
  const totalEntries = recentActivity.reduce((sum, activity) => sum + activity.entry_count, 0)
  const activeJournals = recentActivity.filter(activity => activity.entry_count > 0).length
  const mostRecentActivity = recentActivity.length > 0 ? recentActivity[0] : null

  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Journal Activity</h3>
            <p className="text-sm text-gray-500">Recent writing process captures</p>
          </div>
          <Link
            href="/dashboard/journals"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View all →
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      {recentActivity.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{activeJournals}</div>
              <div className="text-xs text-gray-600">Active Journals</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{totalEntries}</div>
              <div className="text-xs text-gray-600">Total Entries</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {mostRecentActivity ? formatDate(mostRecentActivity.updated_at) : 'N/A'}
              </div>
              <div className="text-xs text-gray-600">Last Activity</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity List */}
      <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
        {recentActivity.length > 0 ? (
          recentActivity.map((activity) => {
            const activityLevel = getActivityLevel(activity.entry_count)
            const documentTitle = activity.documents?.title || 'Untitled Document'

            return (
              <div key={activity.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-3">
                      <Link
                        href={`/dashboard/documents/${activity.documents?.id}/journal`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate"
                      >
                        {documentTitle}
                      </Link>
                      
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${activityLevel.color}`}>
                        <span className="mr-1">{activityLevel.icon}</span>
                        {activityLevel.label}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                      <span>{activity.entry_count} entries</span>
                      <span>•</span>
                      <span>Updated {formatDate(activity.updated_at)}</span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="ml-4 flex items-center space-x-2">
                    <Link
                      href={`/dashboard/documents/${activity.documents?.id}/journal`}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                      title="View journal timeline"
                    >
                      <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Timeline
                    </Link>

                    <Link
                      href={`/dashboard/documents/${activity.documents?.id}`}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                      title="Edit document"
                    >
                      <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No journal activity yet</h3>
            <p className="text-xs text-gray-500 mb-4">
              Start writing and using AI assistance to build your journal history
            </p>
            <Link
              href="/dashboard/documents/new"
              className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Start Writing
            </Link>
          </div>
        )}
      </div>

      {/* Insights Footer */}
      {recentActivity.length > 0 && (
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">Journal Insights</h4>
              <p className="text-xs text-gray-600">
                {totalEntries > 50 && 'Excellent journal coverage! Your writing process is well documented.'}
                {totalEntries > 20 && totalEntries <= 50 && 'Good journal activity. Keep documenting your writing process.'}
                {totalEntries > 0 && totalEntries <= 20 && 'Building your journal history. Continue writing to see more insights.'}
                {totalEntries === 0 && 'Start writing to build your process journal for verification.'}
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link
                href="/dashboard/journals"
                className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-500"
              >
                View Analytics
                <svg className="ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}