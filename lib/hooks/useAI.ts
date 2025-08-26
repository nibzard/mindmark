'use client'

/**
 * AI Integration Hook
 * React hook for AI interactions with automatic journal capture
 */

import { useState, useCallback, useRef } from 'react'
import { 
  type AIGenerationRequest, 
  type AIGenerationResponse, 
  type AIStreamChunk,
  type ConversationMessage,
  type AIModelConfig,
  AIServiceError
} from '@/lib/types/ai'

/**
 * AI Hook Configuration
 */
export interface UseAIConfig {
  journalId?: string
  autoCapture?: boolean
  defaultModel?: AIModelConfig
  onResponse?: (response: AIGenerationResponse) => void
  onError?: (error: AIServiceError) => void
  onStreamChunk?: (chunk: AIStreamChunk) => void
}

/**
 * AI Hook State
 */
export interface AIState {
  isGenerating: boolean
  isStreaming: boolean
  currentResponse: string
  usage?: AIGenerationResponse['usage']
  error?: string
  messages: ConversationMessage[]
}

/**
 * AI Hook Return Type
 */
export interface UseAIReturn extends AIState {
  // Text generation
  generateText: (prompt: string, options?: Partial<AIGenerationRequest>) => Promise<AIGenerationResponse | null>
  streamText: (prompt: string, options?: Partial<AIGenerationRequest>) => Promise<void>
  
  // Journal capture
  captureInteraction: (prompt: string, response: string, metadata?: Record<string, any>) => Promise<void>
  capturePrompt: (prompt: string, metadata?: Record<string, any>) => Promise<string | null>
  captureResponse: (response: string, metadata?: Record<string, any>) => Promise<string | null>
  
  // Conversation management
  addMessage: (message: ConversationMessage) => void
  clearMessages: () => void
  undoLastMessage: () => void
  
  // State management
  reset: () => void
  stopGeneration: () => void
}

/**
 * AI Integration Hook
 */
export function useAI(config: UseAIConfig = {}): UseAIReturn {
  const {
    journalId,
    autoCapture = true,
    defaultModel = {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 2000
    },
    onResponse,
    onError,
    onStreamChunk
  } = config

  // State
  const [state, setState] = useState<AIState>({
    isGenerating: false,
    isStreaming: false,
    currentResponse: '',
    messages: []
  })

  // Refs for controlling generation
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Generate text (non-streaming)
   */
  const generateText = useCallback(async (
    prompt: string,
    options: Partial<AIGenerationRequest> = {}
  ): Promise<AIGenerationResponse | null> => {
    if (state.isGenerating) {
      console.warn('Generation already in progress')
      return null
    }

    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: undefined,
      currentResponse: ''
    }))

    try {
      // Prepare messages
      const messages: ConversationMessage[] = [
        ...state.messages,
        { role: 'user', content: prompt, timestamp: new Date().toISOString() }
      ]

      // Prepare request
      const request: AIGenerationRequest = {
        messages,
        modelConfig: { ...defaultModel, ...options.modelConfig },
        journalId: autoCapture ? journalId : undefined,
        ...options
      }

      // Create abort controller
      abortControllerRef.current = new AbortController()

      // Make API call
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Generation failed')
      }

      const result: AIGenerationResponse = await response.json()

      // Update state
      setState(prev => ({
        ...prev,
        isGenerating: false,
        currentResponse: result.content,
        usage: result.usage,
        messages: [
          ...messages,
          { 
            role: 'assistant', 
            content: result.content, 
            timestamp: result.metadata.timestamp 
          }
        ]
      }))

      // Automatically capture the interaction if enabled
      if (config.autoCapture && config.journalId) {
        try {
          await captureInteraction(prompt, result.content, {
            provider: result.provider,
            model: result.model,
            usage: result.usage,
            request_id: result.metadata.requestId
          })
        } catch (captureError) {
          console.warn('Failed to capture AI interaction:', captureError)
          // Don't fail the generation for capture errors
        }
      }

      // Call callback
      onResponse?.(result)

      return result

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Generation was aborted, don't treat as error
        setState(prev => ({ ...prev, isGenerating: false }))
        return null
      }

      const aiError = new AIServiceError(
        error instanceof Error ? error.message : 'Generation failed',
        defaultModel.provider
      )

      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: aiError.message
      }))

      onError?.(aiError)
      return null
    }
  }, [state.messages, state.isGenerating, defaultModel, journalId, autoCapture, captureInteraction, onResponse, onError])

  /**
   * Stream text generation
   */
  const streamText = useCallback(async (
    prompt: string,
    options: Partial<AIGenerationRequest> = {}
  ): Promise<void> => {
    if (state.isGenerating || state.isStreaming) {
      console.warn('Generation already in progress')
      return
    }

    setState(prev => ({
      ...prev,
      isStreaming: true,
      isGenerating: true,
      error: undefined,
      currentResponse: ''
    }))

    try {
      // Prepare messages
      const messages: ConversationMessage[] = [
        ...state.messages,
        { role: 'user', content: prompt, timestamp: new Date().toISOString() }
      ]

      // Prepare request
      const request: AIGenerationRequest = {
        messages,
        modelConfig: { ...defaultModel, ...options.modelConfig },
        stream: true,
        journalId: autoCapture ? journalId : undefined,
        ...options
      }

      // Create abort controller
      abortControllerRef.current = new AbortController()

      // Make streaming API call
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Streaming failed')
      }

      // Process stream
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Stream reader not available')
      }

      const decoder = new TextDecoder()
      let finalUsage: AIGenerationResponse['usage'] | undefined

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              break
            }

            try {
              const streamChunk: AIStreamChunk = JSON.parse(data)
              
              setState(prev => ({
                ...prev,
                currentResponse: streamChunk.content
              }))

              if (streamChunk.usage) {
                finalUsage = streamChunk.usage
              }

              onStreamChunk?.(streamChunk)
            } catch (parseError) {
              console.warn('Failed to parse stream chunk:', parseError)
            }
          }
        }
      }

      // Update final state
      setState(prev => ({
        ...prev,
        isStreaming: false,
        isGenerating: false,
        usage: finalUsage,
        messages: [
          ...messages,
          { 
            role: 'assistant', 
            content: prev.currentResponse, 
            timestamp: new Date().toISOString() 
          }
        ]
      }))

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Streaming was aborted
        setState(prev => ({ 
          ...prev, 
          isStreaming: false, 
          isGenerating: false 
        }))
        return
      }

      const aiError = new AIServiceError(
        error instanceof Error ? error.message : 'Streaming failed',
        defaultModel.provider
      )

      setState(prev => ({
        ...prev,
        isStreaming: false,
        isGenerating: false,
        error: aiError.message
      }))

      onError?.(aiError)
    }
  }, [state.messages, state.isGenerating, state.isStreaming, defaultModel, journalId, autoCapture, onStreamChunk, onError])

  /**
   * Add message to conversation
   */
  const addMessage = useCallback((message: ConversationMessage) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message]
    }))
  }, [])

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: []
    }))
  }, [])

  /**
   * Undo last message
   */
  const undoLastMessage = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.slice(0, -1)
    }))
  }, [])

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      isStreaming: false,
      currentResponse: '',
      messages: []
    })
  }, [])

  /**
   * Stop current generation
   */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  /**
   * Capture a prompt in the journal
   */
  const capturePrompt = useCallback(async (prompt: string, metadata?: Record<string, any>): Promise<string | null> => {
    if (!config.journalId || !config.autoCapture) {
      return null
    }

    try {
      const response = await fetch('/api/documents/journal-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          journalId: config.journalId,
          entry_type: 'prompt',
          content: prompt,
          metadata: {
            ...metadata,
            captured_via: 'useAI_hook',
            timestamp: new Date().toISOString()
          }
        })
      })

      if (!response.ok) {
        console.warn('Failed to capture prompt in journal')
        return null
      }

      const { entry } = await response.json()
      return entry.id
    } catch (error) {
      console.warn('Error capturing prompt:', error)
      return null
    }
  }, [config.journalId, config.autoCapture])

  /**
   * Capture a response in the journal
   */
  const captureResponse = useCallback(async (responseText: string, metadata?: Record<string, any>): Promise<string | null> => {
    if (!config.journalId || !config.autoCapture) {
      return null
    }

    try {
      const response = await fetch('/api/documents/journal-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          journalId: config.journalId,
          entry_type: 'response',
          content: responseText,
          metadata: {
            ...metadata,
            captured_via: 'useAI_hook',
            timestamp: new Date().toISOString()
          }
        })
      })

      if (!response.ok) {
        console.warn('Failed to capture response in journal')
        return null
      }

      const { entry } = await response.json()
      return entry.id
    } catch (error) {
      console.warn('Error capturing response:', error)
      return null
    }
  }, [config.journalId, config.autoCapture])

  /**
   * Capture a complete AI interaction
   */
  const captureInteraction = useCallback(async (
    prompt: string, 
    responseText: string, 
    metadata?: Record<string, any>
  ): Promise<void> => {
    if (!config.journalId || !config.autoCapture) {
      return
    }

    try {
      // Capture prompt first
      const promptId = await capturePrompt(prompt, {
        ...metadata,
        interaction_type: 'prompt'
      })

      // Capture response with reference to prompt
      await captureResponse(responseText, {
        ...metadata,
        interaction_type: 'response',
        prompt_entry_id: promptId
      })
    } catch (error) {
      console.warn('Error capturing AI interaction:', error)
    }
  }, [capturePrompt, captureResponse, config.journalId, config.autoCapture])

  return {
    ...state,
    generateText,
    streamText,
    captureInteraction,
    capturePrompt,
    captureResponse,
    addMessage,
    clearMessages,
    undoLastMessage,
    reset,
    stopGeneration
  }
}