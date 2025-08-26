'use client'

/**
 * ABOUTME: Chronological timeline visualization of journal entries showing writing process flow
 * ABOUTME: Interactive timeline with entry clustering, time gaps, and process pattern visualization
 */

import { useState, useMemo } from 'react'
import { JournalEntry } from './JournalEntry'
import type { JournalEntry as JournalEntryType } from '@/lib/types/database'

interface JournalTimelineProps {
  entries: JournalEntryType[]
  journalId: string
  className?: string
}

interface TimelineCluster {
  id: string
  entries: JournalEntryType[]
  startTime: Date
  endTime: Date
  duration: number
  title: string
  type: 'session' | 'break' | 'burst'
}

const CLUSTER_THRESHOLD = 30 * 60 * 1000 // 30 minutes

export function JournalTimeline({ 
  entries, 
  journalId,
  className = '' 
}: JournalTimelineProps) {
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null)
  const [showTimeGaps, setShowTimeGaps] = useState(true)

  // Group entries into timeline clusters based on temporal proximity
  const clusters = useMemo(() => {
    if (entries.length === 0) return []

    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const clusters: TimelineCluster[] = []
    let currentCluster: JournalEntryType[] = [sortedEntries[0]]
    let clusterStartTime = new Date(sortedEntries[0].created_at)

    for (let i = 1; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i]
      const entryTime = new Date(entry.created_at)
      const lastEntryTime = new Date(currentCluster[currentCluster.length - 1].created_at)
      
      const timeDiff = entryTime.getTime() - lastEntryTime.getTime()

      if (timeDiff <= CLUSTER_THRESHOLD) {
        // Same session - add to current cluster
        currentCluster.push(entry)
      } else {
        // New session - finalize current cluster and start new one
        const clusterEndTime = new Date(currentCluster[currentCluster.length - 1].created_at)
        const duration = clusterEndTime.getTime() - clusterStartTime.getTime()
        
        clusters.push({
          id: `cluster-${clusters.length}`,
          entries: [...currentCluster],
          startTime: clusterStartTime,
          endTime: clusterEndTime,
          duration,
          title: getClusterTitle(currentCluster, clusterStartTime),
          type: getClusterType(currentCluster, duration)
        })

        currentCluster = [entry]
        clusterStartTime = entryTime
      }
    }

    // Don't forget the last cluster
    if (currentCluster.length > 0) {
      const clusterEndTime = new Date(currentCluster[currentCluster.length - 1].created_at)
      const duration = clusterEndTime.getTime() - clusterStartTime.getTime()
      
      clusters.push({
        id: `cluster-${clusters.length}`,
        entries: [...currentCluster],
        startTime: clusterStartTime,
        endTime: clusterEndTime,
        duration,
        title: getClusterTitle(currentCluster, clusterStartTime),
        type: getClusterType(currentCluster, duration)
      })
    }

    return clusters
  }, [entries])

  function getClusterTitle(entries: JournalEntryType[], startTime: Date): string {
    const date = startTime.toLocaleDateString()
    const time = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const entryTypes = new Set(entries.map(e => e.entry_type))
    
    if (entryTypes.has('prompt') && entryTypes.has('response')) {
      return `AI Session - ${date} ${time}`
    } else if (entryTypes.has('revision')) {
      return `Revision Session - ${date} ${time}`
    } else if (entryTypes.has('decision')) {
      return `Decision Point - ${date} ${time}`
    } else {
      return `Writing Session - ${date} ${time}`
    }
  }

  function getClusterType(entries: JournalEntryType[], duration: number): 'session' | 'break' | 'burst' {
    if (duration < 5 * 60 * 1000) return 'burst' // Less than 5 minutes
    if (duration > 60 * 60 * 1000) return 'session' // More than 1 hour
    return 'session'
  }

  function formatDuration(ms: number): string {
    const minutes = Math.floor(ms / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m`
    } else {
      return '< 1m'
    }
  }

  function getTimeSinceLastCluster(cluster: TimelineCluster, index: number): number | null {
    if (index === 0) return null
    const prevCluster = clusters[index - 1]
    return cluster.startTime.getTime() - prevCluster.endTime.getTime()
  }

  const clusterTypeStyles = {
    session: 'bg-blue-50 border-blue-200',
    break: 'bg-green-50 border-green-200',
    burst: 'bg-yellow-50 border-yellow-200'
  }

  if (entries.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-500">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No timeline data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Timeline Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Writing Process Timeline</h3>
          <p className="text-sm text-gray-500">
            {clusters.length} session{clusters.length !== 1 ? 's' : ''} • {entries.length} entries
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={showTimeGaps}
              onChange={(e) => setShowTimeGaps(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <span className="ml-2 text-gray-700">Show time gaps</span>
          </label>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {clusters.map((cluster, index) => {
          const timeSinceLast = getTimeSinceLastCluster(cluster, index)
          const isSelected = selectedCluster === cluster.id
          
          return (
            <div key={cluster.id} className="relative">
              {/* Time Gap Indicator */}
              {showTimeGaps && timeSinceLast && timeSinceLast > CLUSTER_THRESHOLD && (
                <div className="relative mb-4">
                  <div className="absolute left-8 -ml-2 w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <div className="ml-16 text-sm text-gray-500 italic">
                    {formatDuration(timeSinceLast)} break
                  </div>
                </div>
              )}

              {/* Cluster */}
              <div className="relative mb-6">
                {/* Timeline Dot */}
                <div className={`absolute left-8 -ml-3 w-6 h-6 rounded-full border-4 ${
                  cluster.type === 'session' ? 'bg-blue-600 border-blue-200' :
                  cluster.type === 'burst' ? 'bg-yellow-500 border-yellow-200' :
                  'bg-green-600 border-green-200'
                }`}></div>

                {/* Cluster Content */}
                <div className={`ml-16 border rounded-lg p-4 ${clusterTypeStyles[cluster.type]}`}>
                  {/* Cluster Header */}
                  <button
                    onClick={() => setSelectedCluster(isSelected ? null : cluster.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{cluster.title}</h4>
                        <p className="text-sm text-gray-600">
                          {cluster.entries.length} entries • {formatDuration(cluster.duration)}
                        </p>
                      </div>
                      <svg
                        className={`h-5 w-5 text-gray-400 transform transition-transform ${
                          isSelected ? 'rotate-90' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>

                  {/* Cluster Details */}
                  {isSelected && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      {cluster.entries.map((entry, entryIndex) => (
                        <JournalEntry
                          key={entry.id}
                          entry={entry}
                          showSequence={true}
                          showTimestamp={true}
                          showHash={false}
                          index={entryIndex}
                          className="bg-white"
                        />
                      ))}
                    </div>
                  )}

                  {/* Entry Type Summary */}
                  {!isSelected && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Array.from(new Set(cluster.entries.map(e => e.entry_type))).map(type => (
                        <span
                          key={type}
                          className="inline-block px-2 py-1 text-xs bg-white bg-opacity-60 rounded"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Timeline End */}
        <div className="relative">
          <div className="absolute left-8 -ml-2 w-4 h-4 bg-gray-400 rounded-full"></div>
          <div className="ml-16 text-sm text-gray-500">Present</div>
        </div>
      </div>
    </div>
  )
}