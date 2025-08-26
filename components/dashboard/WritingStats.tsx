'use client'

/**
 * ABOUTME: Overall writing statistics widget showing key metrics across all user documents
 * ABOUTME: Displays document count, journal count, total entries, and productivity indicators
 */

import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface WritingStatsProps {
  documentCount: number
  journalCount: number
  totalEntries: number
  userId: string
  className?: string
}

interface ExtendedStats {
  avgEntriesPerDocument: number
  recentActivity: {
    documentsThisWeek: number
    entriesThisWeek: number
  }
  productivity: {
    score: number
    trend: 'up' | 'down' | 'stable'
  }
}

export function WritingStats({
  documentCount,
  journalCount,
  totalEntries,
  userId,
  className = ''
}: WritingStatsProps) {
  const [extendedStats, setExtendedStats] = useState<ExtendedStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Calculate extended statistics
    const calculateExtendedStats = async () => {
      try {
        // For now, calculate basic derived stats
        // In a real implementation, you'd fetch more detailed data
        const avgEntriesPerDocument = documentCount > 0 ? Math.round(totalEntries / documentCount) : 0
        
        // Mock recent activity (would be calculated from actual data)
        const documentsThisWeek = Math.floor(documentCount * 0.3) // Rough estimate
        const entriesThisWeek = Math.floor(totalEntries * 0.4) // Rough estimate
        
        // Simple productivity score based on activity
        let productivityScore = 0
        if (totalEntries > 0) {
          productivityScore = Math.min(
            (totalEntries * 2) + (documentCount * 10) + (journalCount * 5), 
            100
          )
        }
        
        // Trend would be calculated from historical data
        const trend: 'up' | 'down' | 'stable' = productivityScore > 70 ? 'up' : 
                      productivityScore > 30 ? 'stable' : 'down'

        setExtendedStats({
          avgEntriesPerDocument,
          recentActivity: {
            documentsThisWeek,
            entriesThisWeek
          },
          productivity: {
            score: productivityScore,
            trend
          }
        })
      } catch (error) {
        console.error('Error calculating extended stats:', error)
      } finally {
        setLoading(false)
      }
    }

    calculateExtendedStats()
  }, [documentCount, journalCount, totalEntries])

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <span className="text-green-500">↗</span>
      case 'down':
        return <span className="text-red-500">↘</span>
      default:
        return <span className="text-gray-500">→</span>
    }
  }

  const getProductivityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Writing Statistics</h3>
        <p className="text-sm text-gray-500">Your overall writing activity overview</p>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-900">{documentCount}</div>
                <div className="text-sm text-blue-700">Documents</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-900">{journalCount}</div>
                <div className="text-sm text-green-700">Journals</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-900">{totalEntries.toLocaleString()}</div>
                <div className="text-sm text-purple-700">Total Entries</div>
              </div>
              
              {extendedStats && (
                <div className={`text-center p-4 rounded-lg border ${getProductivityColor(extendedStats.productivity.score)}`}>
                  <div className="text-2xl font-bold flex items-center justify-center">
                    {extendedStats.productivity.score}
                    <span className="ml-1">{getTrendIcon(extendedStats.productivity.trend)}</span>
                  </div>
                  <div className="text-sm">Productivity</div>
                </div>
              )}
            </div>

            {/* Extended Stats */}
            {extendedStats && (
              <div className="border-t border-gray-200 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Avg entries/doc:</span>
                    <span className="font-medium text-gray-900">
                      {extendedStats.avgEntriesPerDocument}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Docs this week:</span>
                    <span className="font-medium text-gray-900">
                      {extendedStats.recentActivity.documentsThisWeek}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Entries this week:</span>
                    <span className="font-medium text-gray-900">
                      {extendedStats.recentActivity.entriesThisWeek}
                    </span>
                  </div>
                </div>

                {/* Productivity Insights */}
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Productivity Score</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {extendedStats.productivity.score >= 80 && 'Excellent! You\'re highly productive with consistent writing habits.'}
                        {extendedStats.productivity.score >= 60 && extendedStats.productivity.score < 80 && 'Good progress! Keep up the regular writing routine.'}
                        {extendedStats.productivity.score >= 40 && extendedStats.productivity.score < 60 && 'Moderate activity. Consider setting a regular writing schedule.'}
                        {extendedStats.productivity.score < 40 && 'Getting started! Begin with small, consistent writing sessions.'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {extendedStats.productivity.score}
                      </div>
                      <div className="text-sm text-gray-500">
                        {getTrendIcon(extendedStats.productivity.trend)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {documentCount === 0 && (
              <div className="text-center py-6 border-t border-gray-200">
                <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-sm text-gray-500">Start writing to see your statistics!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}