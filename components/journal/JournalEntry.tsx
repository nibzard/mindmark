'use client'

/**
 * ABOUTME: Individual journal entry display component with metadata, content, and verification info
 * ABOUTME: Shows entry type, timestamp, hash chain info, and formatted content with syntax highlighting
 */

import { useState } from 'react'
import type { JournalEntry as JournalEntryType } from '@/lib/types/database'

interface JournalEntryProps {
  entry: JournalEntryType
  showSequence?: boolean
  showTimestamp?: boolean
  showHash?: boolean
  showMetadata?: boolean
  index?: number
  className?: string
}

const entryTypeConfig = {
  prompt: {
    label: 'AI Prompt',
    color: 'bg-blue-100 text-blue-800',
    icon: '🤖'
  },
  response: {
    label: 'AI Response',
    color: 'bg-green-100 text-green-800',
    icon: '✨'
  },
  decision: {
    label: 'Decision',
    color: 'bg-purple-100 text-purple-800',
    icon: '🎯'
  },
  annotation: {
    label: 'Note',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '📝'
  },
  revision: {
    label: 'Revision',
    color: 'bg-orange-100 text-orange-800',
    icon: '✏️'
  },
  voice: {
    label: 'Voice Note',
    color: 'bg-pink-100 text-pink-800',
    icon: '🎤'
  }
}

export function JournalEntry({
  entry,
  showSequence = false,
  showTimestamp = false,
  showHash = false,
  showMetadata = false,
  index,
  className = ''
}: JournalEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showHashDetails, setShowHashDetails] = useState(false)
  const [showMetadataDetails, setShowMetadataDetails] = useState(false)

  const config = entryTypeConfig[entry.entry_type] || entryTypeConfig.annotation
  const timestamp = new Date(entry.created_at)
  const content = entry.content || ''
  const isLongContent = content.length > 300

  // Format content for display
  const formatContent = (content: string) => {
    // Basic markdown-style formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/\n/g, '<br/>')
  }

  const displayContent = isLongContent && !isExpanded 
    ? content.slice(0, 300) + '...'
    : content

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Entry Type Badge */}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
              <span className="mr-1">{config.icon}</span>
              {config.label}
            </span>

            {/* Sequence Number */}
            {showSequence && (
              <span className="text-sm text-gray-500">
                #{entry.sequence}
              </span>
            )}

            {/* Index */}
            {typeof index === 'number' && (
              <span className="text-sm text-gray-500">
                Entry {index + 1}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-500">
            {/* Timestamp */}
            {showTimestamp && (
              <span>
                {timestamp.toLocaleDateString()} {timestamp.toLocaleTimeString()}
              </span>
            )}

            {/* Hash Info */}
            {showHash && (
              <button
                onClick={() => setShowHashDetails(!showHashDetails)}
                className="text-blue-600 hover:text-blue-800 text-xs"
                title="View hash chain details"
              >
                🔗 {entry.content_hash.slice(0, 8)}...
              </button>
            )}
          </div>
        </div>

        {/* Hash Details */}
        {showHashDetails && (
          <div className="mt-3 p-3 bg-white border border-gray-200 rounded text-xs space-y-1">
            <div>
              <span className="font-medium">Content Hash:</span>
              <code className="ml-2 font-mono text-gray-600">{entry.content_hash}</code>
            </div>
            <div>
              <span className="font-medium">Previous Hash:</span>
              <code className="ml-2 font-mono text-gray-600">
                {entry.prev_hash || 'Genesis Entry'}
              </code>
            </div>
            <div className="text-gray-500">
              Hash chain ensures entry integrity and chronological order
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <div className="prose prose-sm max-w-none">
          <div 
            className="text-gray-900 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatContent(displayContent) }}
          />
        </div>

        {/* Expand/Collapse Button */}
        {isLongContent && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* Metadata */}
      {showMetadata && entry.metadata && Object.keys(entry.metadata).length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <button
            onClick={() => setShowMetadataDetails(!showMetadataDetails)}
            className="text-sm text-gray-600 hover:text-gray-800 font-medium"
          >
            Metadata ({Object.keys(entry.metadata).length} items)
          </button>
          
          {showMetadataDetails && (
            <div className="mt-2 text-xs text-gray-600 space-y-1">
              {Object.entries(entry.metadata).map(([key, value]) => (
                <div key={key} className="flex">
                  <span className="font-medium min-w-0 flex-shrink-0 w-24">
                    {key}:
                  </span>
                  <span className="ml-2 break-all">
                    {typeof value === 'string' ? value : JSON.stringify(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}