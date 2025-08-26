'use client'

/**
 * ABOUTME: Advanced filtering interface for journal entries with search, type filtering, and date ranges
 * ABOUTME: Supports real-time filtering with debounced search and multi-select entry type filtering
 */

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import type { JournalEntryType } from '@/lib/types/database'

interface FilterState {
  searchQuery: string
  entryTypes: JournalEntryType[]
  dateRange: {
    start: string | null
    end: string | null
  }
  showOnlyAI: boolean
}

interface JournalFiltersProps {
  filters: FilterState
  onFilterChange: (filters: Partial<FilterState>) => void
  entryCount: number
  className?: string
}

const entryTypeOptions: Array<{ value: JournalEntryType; label: string; icon: string }> = [
  { value: 'prompt', label: 'AI Prompts', icon: '🤖' },
  { value: 'response', label: 'AI Responses', icon: '✨' },
  { value: 'decision', label: 'Decisions', icon: '🎯' },
  { value: 'annotation', label: 'Annotations', icon: '📝' },
  { value: 'revision', label: 'Revisions', icon: '✏️' },
  { value: 'voice', label: 'Voice Notes', icon: '🎤' }
]

export function JournalFilters({
  filters,
  onFilterChange,
  entryCount,
  className = ''
}: JournalFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchInput, setSearchInput] = useState(filters.searchQuery)

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onFilterChange({ searchQuery: query })
    }, 300),
    [onFilterChange]
  )

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    debouncedSearch(value)
  }

  const handleEntryTypeToggle = (entryType: JournalEntryType) => {
    const currentTypes = filters.entryTypes
    const newTypes = currentTypes.includes(entryType)
      ? currentTypes.filter(type => type !== entryType)
      : [...currentTypes, entryType]
    
    onFilterChange({ entryTypes: newTypes })
  }

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    onFilterChange({
      dateRange: {
        ...filters.dateRange,
        [field]: value || null
      }
    })
  }

  const clearAllFilters = () => {
    setSearchInput('')
    onFilterChange({
      searchQuery: '',
      entryTypes: [],
      dateRange: { start: null, end: null },
      showOnlyAI: false
    })
  }

  const hasActiveFilters = filters.searchQuery || 
    filters.entryTypes.length > 0 || 
    filters.dateRange.start || 
    filters.dateRange.end || 
    filters.showOnlyAI

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Quick Filters Row */}
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Search journal entries..."
              />
            </div>
          </div>

          {/* AI Only Toggle */}
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={filters.showOnlyAI}
              onChange={(e) => onFilterChange({ showOnlyAI: e.target.checked })}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <span className="ml-2 text-gray-700">AI interactions only</span>
          </label>

          {/* Advanced Filters Toggle */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center"
          >
            Advanced
            <svg
              className={`ml-1 h-4 w-4 transform transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>

          {/* Results Count */}
          <span className="text-sm text-gray-500">
            {entryCount} entries
          </span>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="secondary"
              size="sm"
              onClick={clearAllFilters}
              className="text-red-600 hover:text-red-700"
            >
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Entry Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entry Types
            </label>
            <div className="flex flex-wrap gap-2">
              {entryTypeOptions.map((option) => {
                const isSelected = filters.entryTypes.includes(option.value)
                return (
                  <button
                    key={option.value}
                    onClick={() => handleEntryTypeToggle(option.value)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-1">{option.icon}</span>
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={filters.dateRange.start || ''}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={filters.dateRange.end || ''}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Date Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Filters
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Today', days: 0 },
                { label: 'Last 7 days', days: 7 },
                { label: 'Last 30 days', days: 30 },
                { label: 'Last 90 days', days: 90 }
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    const end = new Date().toISOString().split('T')[0]
                    const start = preset.days === 0 
                      ? end
                      : new Date(Date.now() - preset.days * 24 * 60 * 60 * 1000)
                          .toISOString().split('T')[0]
                    
                    onFilterChange({
                      dateRange: { start, end }
                    })
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-600">Active filters:</span>
            
            {filters.searchQuery && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
                Search: "{filters.searchQuery}"
              </span>
            )}
            
            {filters.entryTypes.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-md">
                {filters.entryTypes.length} type{filters.entryTypes.length !== 1 ? 's' : ''}
              </span>
            )}
            
            {(filters.dateRange.start || filters.dateRange.end) && (
              <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-md">
                Date range
              </span>
            )}
            
            {filters.showOnlyAI && (
              <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md">
                AI only
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}