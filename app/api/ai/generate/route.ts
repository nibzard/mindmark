/**
 * AI Text Generation API Route (With Journal Capture)
 * Uses direct API calls to providers and captures interactions in journal
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { createJournalService } from '@/lib/services/journal'
import { aiRateLimit } from '@/lib/middleware/rate-limit'
import { z } from 'zod'

// Request validation schema
const GenerateRequestSchema = z.object({
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
  stream: z.boolean().optional().default(false),
  journalId: z.string().optional(),
  context: z.object({
    documentId: z.string().optional(),
    documentTitle: z.string().optional(),
    currentContent: z.string().optional(),
    writingGoals: z.array(z.string()).optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  return aiRateLimit(request, async () => {
  try {
    // Verify authentication
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request
    const body = await request.json()
    const validatedRequest = GenerateRequestSchema.parse(body)

    // Initialize journal service
    const journalService = createJournalService()
    let promptEntryId: string | undefined
    let responseEntryId: string | undefined

    // Capture prompt in journal if journalId provided
    if (validatedRequest.journalId) {
      try {
        const userMessage = validatedRequest.messages.find(m => m.role === 'user')
        if (userMessage) {
          const promptEntry = await journalService.captureEntry(validatedRequest.journalId, {
            type: 'prompt',
            content: userMessage.content,
            metadata: {
              provider: validatedRequest.modelConfig.provider,
              model: validatedRequest.modelConfig.model,
              context: validatedRequest.context,
              timestamp: new Date().toISOString(),
              user_id: user.id
            }
          })
          promptEntryId = promptEntry.id
        }
      } catch (journalError) {
        console.warn('Failed to capture prompt in journal:', journalError)
        // Don't fail the AI request for journal errors
      }
    }

    // Generate AI response
    let aiResponse
    if (validatedRequest.modelConfig.provider === 'openai') {
      aiResponse = await handleOpenAI(validatedRequest)
    } else if (validatedRequest.modelConfig.provider === 'anthropic') {
      aiResponse = await handleAnthropic(validatedRequest)
    } else {
      return NextResponse.json(
        { error: 'Unsupported provider' },
        { status: 400 }
      )
    }

    // If streaming, return immediately (journal capture will happen client-side)
    if (validatedRequest.stream) {
      return aiResponse
    }

    // For non-streaming, capture response in journal
    if (validatedRequest.journalId && aiResponse.status === 200) {
      try {
        const responseData = await aiResponse.json()
        
        const responseEntry = await journalService.captureEntry(validatedRequest.journalId, {
          type: 'response',
          content: responseData.content,
          metadata: {
            provider: validatedRequest.modelConfig.provider,
            model: validatedRequest.modelConfig.model,
            usage: responseData.usage,
            prompt_entry_id: promptEntryId,
            request_id: responseData.metadata?.requestId,
            timestamp: new Date().toISOString(),
            user_id: user.id
          }
        })
        responseEntryId = responseEntry.id

        // Add journal entry IDs to response
        responseData.journalEntryId = responseEntryId
        responseData.promptEntryId = promptEntryId

        return NextResponse.json(responseData)
        
      } catch (journalError) {
        console.warn('Failed to capture response in journal:', journalError)
        // Return the AI response even if journal capture fails
        return aiResponse
      }
    }

    return aiResponse

  } catch (error) {
    console.error('AI generation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
  })
}

/**
 * Handle OpenAI requests
 */
async function handleOpenAI(request: z.infer<typeof GenerateRequestSchema>) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.modelConfig.model,
        messages: request.messages,
        max_tokens: request.modelConfig.maxTokens || 2000,
        temperature: request.modelConfig.temperature || 0.7,
        top_p: request.modelConfig.topP,
        stream: request.stream
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.error?.message || 'OpenAI API error' },
        { status: response.status }
      )
    }

    if (request.stream) {
      // Return streaming response
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } else {
      // Return non-streaming response
      const result = await response.json()
      
      const aiResponse = {
        content: result.choices[0].message.content,
        model: request.modelConfig.model,
        provider: 'openai' as const,
        usage: {
          promptTokens: result.usage.prompt_tokens,
          completionTokens: result.usage.completion_tokens,
          totalTokens: result.usage.total_tokens,
          estimatedCost: estimateCost(result.usage.total_tokens, request.modelConfig.model, 'openai')
        },
        metadata: {
          requestId: crypto.randomUUID(),
          duration: 0,
          timestamp: new Date().toISOString(),
          finishReason: result.choices[0].finish_reason
        }
      }

      return NextResponse.json(aiResponse)
    }
  } catch (error) {
    console.error('OpenAI error:', error)
    return NextResponse.json(
      { error: 'OpenAI request failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle Anthropic requests
 */
async function handleAnthropic(request: z.infer<typeof GenerateRequestSchema>) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Anthropic API key not configured' },
      { status: 500 }
    )
  }

  try {
    // Convert messages to Anthropic format
    const systemMessage = request.messages.find(m => m.role === 'system')
    const userMessages = request.messages.filter(m => m.role !== 'system')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: request.modelConfig.model,
        max_tokens: request.modelConfig.maxTokens || 2000,
        temperature: request.modelConfig.temperature || 0.7,
        system: systemMessage?.content,
        messages: userMessages,
        stream: request.stream
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.error?.message || 'Anthropic API error' },
        { status: response.status }
      )
    }

    if (request.stream) {
      // Return streaming response
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } else {
      // Return non-streaming response
      const result = await response.json()
      
      const aiResponse = {
        content: result.content[0].text,
        model: request.modelConfig.model,
        provider: 'anthropic' as const,
        usage: {
          promptTokens: result.usage.input_tokens,
          completionTokens: result.usage.output_tokens,
          totalTokens: result.usage.input_tokens + result.usage.output_tokens,
          estimatedCost: estimateCost(result.usage.input_tokens + result.usage.output_tokens, request.modelConfig.model, 'anthropic')
        },
        metadata: {
          requestId: crypto.randomUUID(),
          duration: 0,
          timestamp: new Date().toISOString(),
          finishReason: result.stop_reason
        }
      }

      return NextResponse.json(aiResponse)
    }
  } catch (error) {
    console.error('Anthropic error:', error)
    return NextResponse.json(
      { error: 'Anthropic request failed' },
      { status: 500 }
    )
  }
}

/**
 * Estimate cost for tokens
 */
function estimateCost(tokens: number, model: string, provider: 'openai' | 'anthropic'): number {
  const costs = {
    openai: {
      'gpt-4o': 0.005,
      'gpt-4o-mini': 0.000150,
      'gpt-4-turbo': 0.01,
      'gpt-3.5-turbo': 0.0015
    },
    anthropic: {
      'claude-3-5-sonnet-20241022': 0.003,
      'claude-3-opus-20240229': 0.015,
      'claude-3-haiku-20240307': 0.00025
    }
  }

  const modelCosts = costs[provider] as Record<string, number>
  const costPer1k = modelCosts[model] || 0
  
  return (tokens / 1000) * costPer1k
}