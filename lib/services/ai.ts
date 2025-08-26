/**
 * AI Service (Basic Implementation)
 * Handles AI provider integrations via API routes
 */

import { z } from 'zod'

import {
  type AIProvider,
  type AIModelConfig,
  type AIGenerationRequest,
  type AIGenerationResponse,
  type AIStreamChunk,
  type EmbeddingRequest,
  type EmbeddingResponse,
  type TokenCountResult,
  type ConversationMessage,
  AIServiceError,
  RateLimitError,
  QuotaExceededError,
  InvalidApiKeyError,
  OPENAI_MODELS,
  ANTHROPIC_MODELS
} from '@/lib/types/ai'

import { createJournalService, type JournalService } from './journal'

/**
 * AI Service Interface
 */
export interface AIService {
  generateText(request: AIGenerationRequest): Promise<AIGenerationResponse>
  streamText(request: AIGenerationRequest): AsyncIterable<AIStreamChunk>
  generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse>
  countTokens(text: string, model: string): Promise<TokenCountResult>
  validateApiKey(provider: AIProvider): Promise<boolean>
  getAvailableModels(provider: AIProvider): Promise<string[]>
  estimateCost(tokens: number, model: string, provider: AIProvider): number
  capturePrompt(journalId: string, content: string, metadata?: Record<string, any>): Promise<string>
  captureResponse(journalId: string, content: string, metadata?: Record<string, any>): Promise<string>
  captureInteraction(journalId: string, prompt: string, response: string, metadata?: Record<string, any>): Promise<{ promptId: string; responseId: string }>
}

/**
 * Validation schemas
 */
const GenerationRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string()
  })),
  modelConfig: z.object({
    provider: z.enum(['openai', 'anthropic']),
    model: z.string(),
    maxTokens: z.number().optional(),
    temperature: z.number().min(0).max(2).optional(),
    topP: z.number().min(0).max(1).optional()
  }),
  stream: z.boolean().optional(),
  journalId: z.string().optional()
})

/**
 * Browser AI Service Implementation
 */
export class BrowserAIService implements AIService {
  private journalService: JournalService

  constructor() {
    this.journalService = createJournalService()
  }

  /**
   * Generate text using API route
   */
  async generateText(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    const validatedRequest = GenerationRequestSchema.parse(request)
    
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Generation failed')
      }

      const result: AIGenerationResponse = await response.json()
      return result
    } catch (error) {
      throw this.handleAIError(error, request.modelConfig.provider)
    }
  }

  /**
   * Stream text generation using API route
   */
  async *streamText(request: AIGenerationRequest): AsyncIterable<AIStreamChunk> {
    const validatedRequest = GenerationRequestSchema.parse(request)
    
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, stream: true })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Streaming failed')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Stream reader not available')
      }

      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              return
            }

            try {
              const streamChunk: AIStreamChunk = JSON.parse(data)
              yield streamChunk
            } catch (parseError) {
              console.warn('Failed to parse stream chunk:', parseError)
            }
          }
        }
      }
    } catch (error) {
      throw this.handleAIError(error, request.modelConfig.provider)
    }
  }

  /**
   * Generate embeddings
   */
  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    try {
      const response = await fetch('/api/ai/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`Embedding generation failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Embedding generation failed',
        'openai'
      )
    }
  }

  /**
   * Count tokens (approximate)
   */
  async countTokens(text: string, model: string): Promise<TokenCountResult> {
    try {
      // Approximate token counting (4 chars per token average)
      const approximateTokens = Math.ceil(text.length / 4)
      const provider: AIProvider = model.startsWith('gpt') ? 'openai' : 'anthropic'
      
      return {
        count: approximateTokens,
        model,
        estimatedCost: this.estimateCost(approximateTokens, model, provider)
      }
    } catch (error) {
      throw new AIServiceError(
        `Token counting failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        model.startsWith('gpt') ? 'openai' : 'anthropic'
      )
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(provider: AIProvider): Promise<boolean> {
    try {
      const testRequest: AIGenerationRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        modelConfig: {
          provider,
          model: provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-haiku-20240307',
          maxTokens: 5
        }
      }

      await this.generateText(testRequest)
      return true
    } catch (error) {
      if (error instanceof InvalidApiKeyError) {
        return false
      }
      throw error
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels(provider: AIProvider): Promise<string[]> {
    if (provider === 'openai') {
      return Object.keys(OPENAI_MODELS)
    } else {
      return Object.keys(ANTHROPIC_MODELS)
    }
  }

  /**
   * Estimate cost
   */
  estimateCost(tokens: number, model: string, provider: AIProvider): number {
    const openaiCosts: Record<string, number> = {
      'gpt-4o': 0.005,
      'gpt-4o-mini': 0.000150,
      'gpt-4-turbo': 0.01,
      'gpt-3.5-turbo': 0.0015
    }

    const anthropicCosts: Record<string, number> = {
      'claude-3-5-sonnet-20241022': 0.003,
      'claude-3-opus-20240229': 0.015,
      'claude-3-haiku-20240307': 0.00025
    }

    const costs = provider === 'openai' ? openaiCosts : anthropicCosts
    const costPer1k = costs[model] || 0
    
    return (tokens / 1000) * costPer1k
  }

  /**
   * Handle AI provider errors
   */
  private handleAIError(error: any, provider: AIProvider): AIServiceError {
    if (error instanceof AIServiceError) {
      return error
    }

    if (error.status === 401 || error.message?.includes('authentication')) {
      return new InvalidApiKeyError(provider)
    }

    if (error.status === 429 || error.message?.includes('rate limit')) {
      const retryAfter = error.headers?.['retry-after'] 
        ? parseInt(error.headers['retry-after']) 
        : undefined
      return new RateLimitError(provider, retryAfter)
    }

    if (error.status === 403 || error.message?.includes('quota')) {
      return new QuotaExceededError(provider)
    }

    return new AIServiceError(
      error.message || 'AI service error',
      provider,
      error.code,
      error.status
    )
  }

  /**
   * Capture a prompt in the journal
   */
  async capturePrompt(journalId: string, content: string, metadata?: Record<string, any>): Promise<string> {
    try {
      const response = await fetch('/api/documents/journal-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          journalId,
          entry_type: 'prompt',
          content,
          metadata: {
            ...metadata,
            captured_via: 'ai_service',
            timestamp: new Date().toISOString()
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to capture prompt: ${response.statusText}`)
      }

      const { entry } = await response.json()
      return entry.id
    } catch (error) {
      console.error('Failed to capture prompt in journal:', error)
      throw error
    }
  }

  /**
   * Capture a response in the journal
   */
  async captureResponse(journalId: string, content: string, metadata?: Record<string, any>): Promise<string> {
    try {
      const response = await fetch('/api/documents/journal-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          journalId,
          entry_type: 'response',
          content,
          metadata: {
            ...metadata,
            captured_via: 'ai_service',
            timestamp: new Date().toISOString()
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to capture response: ${response.statusText}`)
      }

      const { entry } = await response.json()
      return entry.id
    } catch (error) {
      console.error('Failed to capture response in journal:', error)
      throw error
    }
  }

  /**
   * Capture a complete AI interaction (prompt + response)
   */
  async captureInteraction(
    journalId: string, 
    prompt: string, 
    response: string, 
    metadata?: Record<string, any>
  ): Promise<{ promptId: string; responseId: string }> {
    try {
      // Capture prompt first
      const promptId = await this.capturePrompt(journalId, prompt, {
        ...metadata,
        interaction_type: 'prompt'
      })

      // Capture response with reference to prompt
      const responseId = await this.captureResponse(journalId, response, {
        ...metadata,
        interaction_type: 'response',
        prompt_entry_id: promptId
      })

      return { promptId, responseId }
    } catch (error) {
      console.error('Failed to capture AI interaction:', error)
      throw error
    }
  }
}

/**
 * Server AI Service Implementation
 */
export class ServerAIService extends BrowserAIService {
  // Server implementation extends browser
}

/**
 * Factory function to create appropriate AI service
 */
export function createAIService(): AIService {
  if (typeof window !== 'undefined') {
    return new BrowserAIService()
  } else {
    return new ServerAIService()
  }
}

/**
 * AI Service Hook for React components
 */
export function useAIService(): AIService {
  return createAIService()
}