/**
 * AI Embedding Generation API Route (With Journal Integration)
 * Handles text embedding generation for semantic search and journal entries
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { createJournalService } from '@/lib/services/journal'
import { openai } from '@ai-sdk/openai'
import { embed } from 'ai'
import { z } from 'zod'

// Request validation schema
const EmbedRequestSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  model: z.string().optional().default('text-embedding-3-small'),
  dimensions: z.number().optional().default(1536),
  journalId: z.string().optional(),
  entryId: z.string().optional(), // Journal entry to update with embedding
  purpose: z.enum(['search', 'journal', 'similarity']).optional().default('search')
})

export async function POST(request: NextRequest) {
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

    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Parse and validate request
    const body = await request.json()
    const { text, model, dimensions, journalId, entryId, purpose } = EmbedRequestSchema.parse(body)

    // Generate embedding
    const startTime = Date.now()
    const result = await embed({
      model: openai.embedding(model),
      value: text
    })

    const response = {
      embedding: result.embedding,
      model,
      usage: {
        promptTokens: result.usage.tokens,
        totalTokens: result.usage.tokens
      },
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        purpose
      }
    }

    // Update journal entry with embedding if entryId provided
    if (entryId) {
      try {
        const { error: updateError } = await supabase
          .from('journal_entries')
          .update({ 
            embedding: result.embedding,
            metadata: supabase.rpc('jsonb_set', {
              target: supabase.from('journal_entries').select('metadata').eq('id', entryId).single(),
              path: '{embedding_metadata}',
              new_value: JSON.stringify({
                model,
                dimensions,
                generated_at: new Date().toISOString(),
                token_count: result.usage.tokens
              })
            })
          })
          .eq('id', entryId)

        if (updateError) {
          console.warn('Failed to update journal entry with embedding:', updateError)
        } else {
          response.metadata.journalEntryUpdated = entryId
        }
      } catch (embedError) {
        console.warn('Failed to update journal entry:', embedError)
      }
    }

    // Generate embedding for journal summary if journalId provided
    if (journalId && purpose === 'journal') {
      try {
        const journalService = createJournalService()
        
        // Update journal summary embedding
        const { error: summaryError } = await supabase
          .from('writing_journals')
          .update({ 
            summary_embedding: result.embedding 
          })
          .eq('id', journalId)

        if (summaryError) {
          console.warn('Failed to update journal summary embedding:', summaryError)
        } else {
          response.metadata.journalSummaryUpdated = journalId
        }
      } catch (journalError) {
        console.warn('Failed to update journal summary:', journalError)
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Embedding generation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.issues },
        { status: 400 }
      )
    }

    // Handle OpenAI specific errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid OpenAI API key' },
          { status: 401 }
        )
      }
      
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        )
      }

      if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'API quota exceeded' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Embedding generation failed' },
      { status: 500 }
    )
  }
}