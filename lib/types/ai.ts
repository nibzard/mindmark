/**
 * AI Service Types
 * Type definitions for AI provider integrations
 */

import { type JournalEntryMetadata } from './database'

/**
 * Supported AI Providers
 */
export type AIProvider = 'openai' | 'anthropic'

/**
 * AI Model Configurations
 */
export interface AIModelConfig {
  provider: AIProvider
  model: string
  maxTokens?: number
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

/**
 * OpenAI Models
 */
export const OPENAI_MODELS = {
  'gpt-4o': { name: 'GPT-4o', contextLength: 128000, costPer1kTokens: 0.005 },
  'gpt-4o-mini': { name: 'GPT-4o Mini', contextLength: 128000, costPer1kTokens: 0.000150 },
  'gpt-4-turbo': { name: 'GPT-4 Turbo', contextLength: 128000, costPer1kTokens: 0.01 },
  'gpt-3.5-turbo': { name: 'GPT-3.5 Turbo', contextLength: 16385, costPer1kTokens: 0.0015 }
} as const

/**
 * Anthropic Models
 */
export const ANTHROPIC_MODELS = {
  'claude-3-5-sonnet-20241022': { name: 'Claude 3.5 Sonnet', contextLength: 200000, costPer1kTokens: 0.003 },
  'claude-3-opus-20240229': { name: 'Claude 3 Opus', contextLength: 200000, costPer1kTokens: 0.015 },
  'claude-3-haiku-20240307': { name: 'Claude 3 Haiku', contextLength: 200000, costPer1kTokens: 0.00025 }
} as const

/**
 * Conversation Message
 */
export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp?: string
  metadata?: Record<string, any>
}

/**
 * AI Generation Request
 */
export interface AIGenerationRequest {
  messages: ConversationMessage[]
  modelConfig: AIModelConfig
  stream?: boolean
  journalId?: string // For automatic journal capture
  selectionRange?: [number, number] // For editor integration
  context?: {
    documentId?: string
    documentTitle?: string
    currentContent?: string
    writingGoals?: string[]
  }
}

/**
 * AI Generation Response
 */
export interface AIGenerationResponse {
  content: string
  model: string
  provider: AIProvider
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    estimatedCost: number
  }
  metadata: {
    requestId: string
    duration: number
    timestamp: string
    finishReason?: 'stop' | 'length' | 'content_filter' | 'function_call'
  }
  journalEntryId?: string // If captured in journal
}

/**
 * Streaming Response Chunk
 */
export interface AIStreamChunk {
  content: string
  delta: string
  isComplete: boolean
  usage?: AIGenerationResponse['usage']
  metadata?: Partial<AIGenerationResponse['metadata']>
}

/**
 * Embedding Request
 */
export interface EmbeddingRequest {
  text: string
  model?: string
  dimensions?: number
  journalId?: string
}

/**
 * Embedding Response
 */
export interface EmbeddingResponse {
  embedding: number[]
  model: string
  usage: {
    promptTokens: number
    totalTokens: number
  }
  metadata: {
    requestId: string
    timestamp: string
  }
}

/**
 * AI Provider Configuration
 */
export interface AIProviderConfig {
  apiKey: string
  baseUrl?: string
  organization?: string
  defaultModel?: string
  maxRetries?: number
  timeout?: number
  rateLimits?: {
    requestsPerMinute: number
    tokensPerMinute: number
  }
}

/**
 * Token Counting Result
 */
export interface TokenCountResult {
  count: number
  model: string
  estimatedCost: number
}

/**
 * AI Service Error Types
 */
export class AIServiceError extends Error {
  constructor(
    message: string,
    public provider: AIProvider,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'AIServiceError'
  }
}

export class RateLimitError extends AIServiceError {
  constructor(provider: AIProvider, retryAfter?: number) {
    super(`Rate limit exceeded for ${provider}`, provider, 'RATE_LIMIT')
    this.retryAfter = retryAfter
  }
  retryAfter?: number
}

export class QuotaExceededError extends AIServiceError {
  constructor(provider: AIProvider) {
    super(`Quota exceeded for ${provider}`, provider, 'QUOTA_EXCEEDED')
  }
}

export class InvalidApiKeyError extends AIServiceError {
  constructor(provider: AIProvider) {
    super(`Invalid API key for ${provider}`, provider, 'INVALID_API_KEY', 401)
  }
}

/**
 * Prompt Templates
 */
export interface PromptTemplate {
  id: string
  name: string
  description: string
  system?: string
  user: string
  variables: string[]
  category: PromptCategory
  tags: string[]
}

export type PromptCategory = 
  | 'writing'
  | 'editing'
  | 'research'
  | 'analysis'
  | 'creative'
  | 'technical'
  | 'custom'

/**
 * Writing Assistant Prompts
 */
export const WRITING_PROMPTS: Record<string, PromptTemplate> = {
  'continue-writing': {
    id: 'continue-writing',
    name: 'Continue Writing',
    description: 'Continue the current text naturally',
    user: 'Continue this text naturally, maintaining the same tone and style:\n\n{{content}}',
    variables: ['content'],
    category: 'writing',
    tags: ['continuation', 'flow']
  },
  'improve-clarity': {
    id: 'improve-clarity',
    name: 'Improve Clarity',
    description: 'Make the text clearer and more concise',
    user: 'Improve the clarity and conciseness of this text while preserving its meaning:\n\n{{content}}',
    variables: ['content'],
    category: 'editing',
    tags: ['clarity', 'concision']
  },
  'expand-ideas': {
    id: 'expand-ideas',
    name: 'Expand Ideas',
    description: 'Develop and expand on the presented ideas',
    user: 'Expand on these ideas with more detail, examples, and supporting points:\n\n{{content}}',
    variables: ['content'],
    category: 'writing',
    tags: ['expansion', 'development']
  },
  'change-tone': {
    id: 'change-tone',
    name: 'Change Tone',
    description: 'Adjust the tone of the text',
    user: 'Rewrite this text with a {{tone}} tone:\n\n{{content}}',
    variables: ['content', 'tone'],
    category: 'editing',
    tags: ['tone', 'style']
  },
  'summarize': {
    id: 'summarize',
    name: 'Summarize',
    description: 'Create a concise summary',
    user: 'Create a concise summary of the main points in this text:\n\n{{content}}',
    variables: ['content'],
    category: 'analysis',
    tags: ['summary', 'analysis']
  }
}

/**
 * AI Integration Events for Journal Capture
 */
export interface AIInteractionEvent {
  type: 'prompt' | 'response' | 'suggestion' | 'correction'
  provider: AIProvider
  model: string
  input: string
  output: string
  usage: AIGenerationResponse['usage']
  context?: {
    selectionRange?: [number, number]
    promptTemplate?: string
    userIntent?: string
  }
  metadata: JournalEntryMetadata
}