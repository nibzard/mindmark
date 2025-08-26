'use client'

/**
 * ABOUTME: Main journal viewing interface with search, filtering, and multiple view modes
 * ABOUTME: Supports both single journal and multi-journal browsing with timeline and list views
 */

import { useState, useMemo } from 'react'
import { JournalEntry } from './JournalEntry'
import { JournalTimeline } from './JournalTimeline'
import { JournalFilters } from './JournalFilters'
import { ProcessInsights } from './ProcessInsights'
import { JournalStats } from './JournalStats'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { WritingJournal, JournalEntry as JournalEntryType, JournalEntryType as EntryType } from '@/lib/types/database'
import { createJournalService } from '@/lib/services/journal'

interface JournalViewerProps {
  journals: Array<WritingJournal & { documents?: any }>
  mode: 'single' | 'all'
  showDocumentContext?: boolean
  documentTitle?: string
}

interface FilterState {
  searchQuery: string
  entryTypes: EntryType[]
  dateRange: {
    start: string | null
    end: string | null
  }
  showOnlyAI: boolean
}

export function JournalViewer({ 
  journals, 
  mode, 
  showDocumentContext = true,
  documentTitle 
}: JournalViewerProps) {
  const [viewMode, setViewMode] = useState<'list' | 'timeline' | 'insights'>('list')
  const [selectedJournalId, setSelectedJournalId] = useState<string>(journals[0]?.id || '')
  const [entries, setEntries] = useState<JournalEntryType[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    entryTypes: [],
    dateRange: { start: null, end: null },
    showOnlyAI: false
  })

  const journalService = createJournalService()
  const currentJournal = journals.find(j => j.id === selectedJournalId) || journals[0]

  // Load entries for selected journal
  const loadEntries = async (journalId: string) => {
    if (!journalId) return
    
    setLoading(true)
    try {
      const journalEntries = await journalService.getEntries(journalId, 1000)
      setEntries(journalEntries)
    } catch (error) {
      console.error('Failed to load journal entries:', error)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  // Load entries when journal selection changes
  useState(() => {
    if (selectedJournalId) {
      loadEntries(selectedJournalId)
    }
  })

  // Filter entries based on current filters
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        if (!entry.content.toLowerCase().includes(query)) {
          return false
        }
      }

      // Entry type filter
      if (filters.entryTypes.length > 0) {
        if (!filters.entryTypes.includes(entry.entry_type)) {
          return false
        }
      }

      // AI-only filter
      if (filters.showOnlyAI) {
        if (!['prompt', 'response'].includes(entry.entry_type)) {
          return false
        }
      }

      // Date range filter
      if (filters.dateRange.start || filters.dateRange.end) {
        const entryDate = new Date(entry.created_at)
        if (filters.dateRange.start && entryDate < new Date(filters.dateRange.start)) {
          return false
        }
        if (filters.dateRange.end && entryDate > new Date(filters.dateRange.end)) {
          return false
        }
      }

      return true
    })
  }, [entries, filters])

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  if (journals.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No journals found</p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {mode === 'all' && journals.length > 1 && (
              <select
                value={selectedJournalId}
                onChange={(e) => {
                  setSelectedJournalId(e.target.value)
                  loadEntries(e.target.value)
                }}
                className="text-lg font-medium border-0 bg-transparent focus:ring-0 focus:outline-none"
              >
                {journals.map(journal => (
                  <option key={journal.id} value={journal.id}>
                    {journal.documents?.title || `Journal ${journal.id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            )}
            
            {mode === 'single' && (
              <h2 className="text-lg font-medium text-gray-900">
                {documentTitle || 'Writing Journal'}
              </h2>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-2 text-sm font-medium border-t border-b ${
                viewMode === 'timeline'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('insights')}
              className={`px-3 py-2 text-sm font-medium rounded-r-md border ${
                viewMode === 'insights'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Insights
            </button>
          </div>
        </div>

        {/* Journal Stats */}
        {currentJournal && (
          <div className="mt-4">
            <JournalStats
              journal={currentJournal}
              entryCount={entries.length}
              filteredCount={filteredEntries.length}
            />
          </div>
        )}
      </div>

      {/* Filters */}
      {viewMode !== 'insights' && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <JournalFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            entryCount={filteredEntries.length}
          />
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {viewMode === 'list' && (
              <div className="space-y-4">
                {filteredEntries.length > 0 ? (
                  filteredEntries.map((entry, index) => (
                    <JournalEntry
                      key={entry.id}
                      entry={entry}
                      showSequence={true}
                      showTimestamp={true}
                      showHash={true}
                      index={index}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {entries.length === 0 
                        ? 'No journal entries found'
                        : 'No entries match the current filters'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}

            {viewMode === 'timeline' && (
              <JournalTimeline
                entries={filteredEntries}
                journalId={selectedJournalId}
              />
            )}

            {viewMode === 'insights' && currentJournal && (
              <ProcessInsights
                journal={currentJournal}
                entries={entries}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}