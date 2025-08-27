'use client'

/**
 * ABOUTME: Analytics dashboard showing writing patterns, AI interaction insights, and process metrics
 * ABOUTME: Visualizes writing behavior, revision patterns, session analysis, and productivity insights
 */

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { WritingJournal, JournalEntry, JournalEntryType } from '@/lib/types/database'

interface ProcessInsightsProps {
  journal: WritingJournal
  entries: JournalEntry[]
  className?: string
}

interface InsightData {
  totalEntries: number
  entryTypes: Record<JournalEntryType, number>
  timeSpent: number
  sessionCount: number
  averageSessionLength: number
  aiInteractionRatio: number
  revisionCount: number
  productivityScore: number
  writingPatterns: {
    mostActiveHour: number
    mostActiveDay: string
    longestSession: number
    shortestSession: number
  }
  processFlow: {
    aiPrompts: number
    aiResponses: number
    decisions: number
    revisions: number
    annotations: number
  }
}

export function ProcessInsights({ journal, entries, className = '' }: ProcessInsightsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'ai-usage'>('overview')

  const insights = useMemo((): InsightData => {
    if (entries.length === 0) {
      return {
        totalEntries: 0,
        entryTypes: {} as Record<JournalEntryType, number>,
        timeSpent: 0,
        sessionCount: 0,
        averageSessionLength: 0,
        aiInteractionRatio: 0,
        revisionCount: 0,
        productivityScore: 0,
        writingPatterns: {
          mostActiveHour: 0,
          mostActiveDay: 'Monday',
          longestSession: 0,
          shortestSession: 0
        },
        processFlow: {
          aiPrompts: 0,
          aiResponses: 0,
          decisions: 0,
          revisions: 0,
          annotations: 0
        }
      }
    }

    // Basic counts
    const entryTypes = entries.reduce((acc, entry) => {
      acc[entry.entry_type] = (acc[entry.entry_type] || 0) + 1
      return acc
    }, {} as Record<JournalEntryType, number>)

    // Time analysis
    const timestamps = entries.map(e => new Date(e.created_at).getTime())
    const timeSpent = timestamps.length > 1 ? Math.max(...timestamps) - Math.min(...timestamps) : 0

    // Session detection (entries within 30 minutes are considered same session)
    const SESSION_THRESHOLD = 30 * 60 * 1000 // 30 minutes
    const sortedTimestamps = [...timestamps].sort((a, b) => a - b)
    let sessionCount = 1
    let sessionLengths: number[] = []
    let currentSessionStart = sortedTimestamps[0]
    let currentSessionEnd = sortedTimestamps[0]

    for (let i = 1; i < sortedTimestamps.length; i++) {
      const timeDiff = sortedTimestamps[i] - sortedTimestamps[i - 1]
      
      if (timeDiff <= SESSION_THRESHOLD) {
        // Same session
        currentSessionEnd = sortedTimestamps[i]
      } else {
        // New session
        sessionLengths.push(currentSessionEnd - currentSessionStart)
        sessionCount++
        currentSessionStart = sortedTimestamps[i]
        currentSessionEnd = sortedTimestamps[i]
      }
    }
    sessionLengths.push(currentSessionEnd - currentSessionStart)

    const averageSessionLength = sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length

    // AI interaction analysis
    const aiEntries = (entryTypes.prompt || 0) + (entryTypes.response || 0)
    const aiInteractionRatio = entries.length > 0 ? aiEntries / entries.length : 0

    // Writing patterns
    const hours = entries.map(e => new Date(e.created_at).getHours())
    const days = entries.map(e => new Date(e.created_at).toLocaleDateString('en', { weekday: 'long' }))
    
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {} as Record<number, number>)
    
    const dayCounts = days.reduce((acc, day) => {
      acc[day] = (acc[day] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const mostActiveHour = Object.entries(hourCounts)
      .reduce((a, b) => hourCounts[parseInt(a[0])] > hourCounts[parseInt(b[0])] ? a : b)[0]
    
    const mostActiveDay = Object.entries(dayCounts)
      .reduce((a, b) => dayCounts[a[0]] > dayCounts[b[0]] ? a : b)[0]

    // Productivity score (0-100 based on various factors)
    const baseScore = Math.min(entries.length * 2, 50) // Entry count contribution
    const aiScore = Math.min(aiInteractionRatio * 30, 30) // AI usage contribution  
    const revisionScore = Math.min((entryTypes.revision || 0) * 5, 20) // Revision contribution
    const productivityScore = baseScore + aiScore + revisionScore

    return {
      totalEntries: entries.length,
      entryTypes,
      timeSpent,
      sessionCount,
      averageSessionLength,
      aiInteractionRatio,
      revisionCount: entryTypes.revision || 0,
      productivityScore,
      writingPatterns: {
        mostActiveHour: parseInt(mostActiveHour),
        mostActiveDay,
        longestSession: Math.max(...sessionLengths, 0),
        shortestSession: Math.min(...sessionLengths, 0)
      },
      processFlow: {
        aiPrompts: entryTypes.prompt || 0,
        aiResponses: entryTypes.response || 0,
        decisions: entryTypes.decision || 0,
        revisions: entryTypes.revision || 0,
        annotations: entryTypes.annotation || 0
      }
    }
  }, [entries])

  const formatDuration = (ms: number): string => {
    if (ms < 60000) return '< 1 min'
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  const formatHour = (hour: number): string => {
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:00 ${ampm}`
  }

  if (entries.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-500">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>No data available for insights</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Process Insights</h3>
          <p className="text-sm text-gray-500">
            Analytics for your writing process and AI collaboration
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'patterns', label: 'Patterns' },
            { id: 'ai-usage', label: 'AI Usage' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">{insights.totalEntries}</div>
                <div className="text-sm text-blue-700">Total Entries</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-900">{insights.sessionCount}</div>
                <div className="text-sm text-green-700">Writing Sessions</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-900">
                  {Math.round(insights.aiInteractionRatio * 100)}%
                </div>
                <div className="text-sm text-purple-700">AI Interactions</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-900">{insights.productivityScore}</div>
                <div className="text-sm text-yellow-700">Productivity Score</div>
              </div>
            </div>

            {/* Entry Types Distribution */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">Entry Types</h4>
              <div className="space-y-2">
                {Object.entries(insights.entryTypes).map(([type, count]) => {
                  const percentage = (count / insights.totalEntries) * 100
                  return (
                    <div key={type} className="flex items-center">
                      <div className="w-24 text-sm text-gray-600 capitalize">{type}</div>
                      <div className="flex-1 mx-3">
                        <div className="bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-900 w-12 text-right">
                        {count}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'patterns' && (
          <div className="space-y-6">
            {/* Time Patterns */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">Writing Patterns</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Most Active Hour:</span>
                    <span className="font-medium">{formatHour(insights.writingPatterns.mostActiveHour)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Most Active Day:</span>
                    <span className="font-medium">{insights.writingPatterns.mostActiveDay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Session:</span>
                    <span className="font-medium">{formatDuration(insights.averageSessionLength)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Longest Session:</span>
                    <span className="font-medium">{formatDuration(insights.writingPatterns.longestSession)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">Process Flow</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span className="text-blue-700">🤖 AI Prompts</span>
                    <span className="font-medium text-blue-900">{insights.processFlow.aiPrompts}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span className="text-green-700">✨ AI Responses</span>
                    <span className="font-medium text-green-900">{insights.processFlow.aiResponses}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                    <span className="text-purple-700">🎯 Decisions</span>
                    <span className="font-medium text-purple-900">{insights.processFlow.decisions}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                    <span className="text-orange-700">✏️ Revisions</span>
                    <span className="font-medium text-orange-900">{insights.processFlow.revisions}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ai-usage' && (
          <div className="space-y-6">
            {/* AI Interaction Analysis */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">AI Collaboration Analysis</h4>
              
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">{insights.processFlow.aiPrompts}</div>
                  <div className="text-sm text-blue-700">Prompts Sent</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">{insights.processFlow.aiResponses}</div>
                  <div className="text-sm text-green-700">Responses Received</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-900">
                    {Math.round(insights.aiInteractionRatio * 100)}%
                  </div>
                  <div className="text-sm text-purple-700">AI Interaction Ratio</div>
                </div>
              </div>

              {/* AI Usage Insights */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-2">Insights</h5>
                <div className="text-sm text-gray-600 space-y-1">
                  {insights.aiInteractionRatio > 0.5 && (
                    <p>• High AI collaboration - you're actively using AI assistance in your writing process</p>
                  )}
                  {insights.processFlow.aiPrompts > insights.processFlow.aiResponses && (
                    <p>• You have more prompts than responses - some interactions may be incomplete</p>
                  )}
                  {insights.processFlow.revisions > insights.processFlow.aiPrompts && (
                    <p>• High revision activity - you're iterating and refining your work extensively</p>
                  )}
                  {insights.productivityScore > 80 && (
                    <p>• Excellent productivity score - your writing process shows strong engagement</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}