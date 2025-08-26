'use client'

/**
 * ABOUTME: Quick statistics summary widget for journal metadata and key metrics
 * ABOUTME: Compact display of entry counts, time spans, verification status, and activity indicators
 */

import { useMemo } from 'react'
import type { WritingJournal, JournalEntry } from '@/lib/types/database'

interface JournalStatsProps {
  journal: WritingJournal
  entryCount?: number
  filteredCount?: number
  entries?: JournalEntry[]
  showVerification?: boolean
  compact?: boolean
  className?: string
}

export function JournalStats({
  journal,
  entryCount,
  filteredCount,
  entries,
  showVerification = false,
  compact = false,
  className = ''
}: JournalStatsProps) {
  const stats = useMemo(() => {
    const createdDate = new Date(journal.created_at)
    const updatedDate = new Date(journal.updated_at || journal.created_at)
    
    // Time calculations
    const daysSinceCreated = Math.floor(
      (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    const daysSinceUpdated = Math.floor(
      (Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    let activityMetrics = null
    if (entries && entries.length > 0) {
      // Calculate writing activity metrics
      const timestamps = entries.map(e => new Date(e.created_at).getTime())
      const timeSpan = Math.max(...timestamps) - Math.min(...timestamps)
      
      // Entry types distribution
      const entryTypes = entries.reduce((acc, entry) => {
        acc[entry.entry_type] = (acc[entry.entry_type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const aiEntries = (entryTypes.prompt || 0) + (entryTypes.response || 0)
      const aiRatio = entries.length > 0 ? aiEntries / entries.length : 0

      activityMetrics = {
        timeSpan,
        aiRatio,
        entryTypes,
        averageEntriesPerDay: daysSinceCreated > 0 ? entries.length / daysSinceCreated : entries.length
      }
    }

    return {
      createdDate,
      updatedDate,
      daysSinceCreated,
      daysSinceUpdated,
      activityMetrics
    }
  }, [journal, entries])

  const formatDate = (date: Date): string => {
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    
    return date.toLocaleDateString()
  }

  const formatDuration = (ms: number): string => {
    if (ms < 60000) return '< 1 min'
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-4 text-sm text-gray-600 ${className}`}>
        <span className="flex items-center">
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {entryCount || journal.entry_count} entries
        </span>
        
        {filteredCount !== undefined && filteredCount !== (entryCount || journal.entry_count) && (
          <span className="text-blue-600">
            ({filteredCount} filtered)
          </span>
        )}
        
        <span className="flex items-center">
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatDate(stats.updatedDate)}
        </span>

        {showVerification && (
          <span className="flex items-center text-green-600">
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Verified
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Entry Count */}
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {entryCount || journal.entry_count}
          </div>
          <div className="text-sm text-gray-600">
            Total Entries
            {filteredCount !== undefined && filteredCount !== (entryCount || journal.entry_count) && (
              <div className="text-xs text-blue-600 mt-1">
                {filteredCount} filtered
              </div>
            )}
          </div>
        </div>

        {/* Age */}
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {stats.daysSinceCreated === 0 ? 'Today' : `${stats.daysSinceCreated}d`}
          </div>
          <div className="text-sm text-gray-600">Journal Age</div>
        </div>

        {/* Last Activity */}
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {stats.daysSinceUpdated === 0 ? 'Today' : `${stats.daysSinceUpdated}d`}
          </div>
          <div className="text-sm text-gray-600">Last Active</div>
        </div>

        {/* Privacy Status */}
        <div className="text-center">
          <div className="text-lg font-semibold">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              journal.privacy_level === 'private' 
                ? 'bg-red-100 text-red-800'
                : journal.privacy_level === 'public'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {journal.privacy_level === 'private' && '🔒'}
              {journal.privacy_level === 'public' && '🌍'}
              {journal.privacy_level === 'summary' && '📋'}
              {' '}{journal.privacy_level}
            </span>
          </div>
          <div className="text-sm text-gray-600">Privacy</div>
        </div>
      </div>

      {/* Extended Stats */}
      {stats.activityMetrics && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Writing span:</span>
              <span className="font-medium">
                {formatDuration(stats.activityMetrics.timeSpan)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">AI interaction:</span>
              <span className="font-medium text-blue-600">
                {Math.round(stats.activityMetrics.aiRatio * 100)}%
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Avg per day:</span>
              <span className="font-medium">
                {stats.activityMetrics.averageEntriesPerDay.toFixed(1)} entries
              </span>
            </div>
          </div>

          {/* Entry Type Breakdown */}
          <div className="mt-3">
            <div className="text-xs text-gray-500 mb-1">Entry types:</div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(stats.activityMetrics.entryTypes).map(([type, count]) => (
                <span
                  key={type}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-white text-gray-700 border border-gray-200"
                  title={`${count} ${type} entries`}
                >
                  {type}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Verification Badge */}
      {showVerification && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center text-sm">
            <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-green-700 font-medium">Hash Chain Verified</span>
          </div>
        </div>
      )}
    </div>
  )
}