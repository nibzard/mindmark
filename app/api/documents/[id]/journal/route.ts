/**
 * Document Journal API Route
 * Handles access to document's writing journal
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { createJournalService } from '@/lib/services/journal'
import { z } from 'zod'

// Validation schemas
const JournalQuerySchema = z.object({
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
  entry_type: z.enum(['prompt', 'response', 'decision', 'annotation', 'revision', 'voice']).optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional()
})

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/documents/[id]/journal
 * Get journal entries for a specific document
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const documentId = params.id

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
      entry_type: searchParams.get('entry_type') || undefined,
      from_date: searchParams.get('from_date') || undefined,
      to_date: searchParams.get('to_date') || undefined
    }

    const validatedQuery = JournalQuerySchema.parse(queryParams)

    // First, verify document ownership and get journal ID
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, writing_journal_id, writing_journals(privacy_level)')
      .eq('id', documentId)
      .eq('writer_id', user.id)
      .single()

    if (docError) {
      if (docError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
    }

    if (!document.writing_journal_id) {
      return NextResponse.json({ error: 'No journal associated with this document' }, { status: 404 })
    }

    // Build journal entries query
    let query = supabase
      .from('journal_entries')
      .select(`
        id,
        sequence,
        entry_type,
        content,
        content_hash,
        prev_hash,
        metadata,
        created_at
      `)
      .eq('journal_id', document.writing_journal_id)
      .order('sequence', { ascending: true })
      .range(validatedQuery.offset || 0, (validatedQuery.offset || 0) + (validatedQuery.limit || 50) - 1)

    // Apply filters
    if (validatedQuery.entry_type) {
      query = query.eq('entry_type', validatedQuery.entry_type)
    }

    if (validatedQuery.from_date) {
      query = query.gte('created_at', validatedQuery.from_date)
    }

    if (validatedQuery.to_date) {
      query = query.lte('created_at', validatedQuery.to_date)
    }

    const { data: entries, error: entriesError, count } = await query

    if (entriesError) {
      console.error('Failed to fetch journal entries:', entriesError)
      return NextResponse.json({ error: 'Failed to fetch journal entries' }, { status: 500 })
    }

    // Get journal summary information
    const { data: journalInfo, error: journalError } = await supabase
      .from('writing_journals')
      .select(`
        id,
        entry_count,
        privacy_level,
        summary,
        last_checkpoint_at,
        created_at
      `)
      .eq('id', document.writing_journal_id)
      .single()

    if (journalError) {
      console.error('Failed to fetch journal info:', journalError)
      return NextResponse.json({ error: 'Failed to fetch journal info' }, { status: 500 })
    }

    return NextResponse.json({
      journal: journalInfo,
      entries: entries || [],
      count,
      hasMore: ((validatedQuery.offset || 0) + (validatedQuery.limit || 50)) < (count || 0)
    })

  } catch (error) {
    console.error('Journal fetch error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/documents/[id]/journal
 * Add a manual journal entry (for annotations, decisions, etc.)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const documentId = params.id

    // Validation schema for manual entries
    const ManualEntrySchema = z.object({
      entry_type: z.enum(['annotation', 'decision', 'revision']),
      content: z.string().min(1, 'Content is required'),
      metadata: z.record(z.any()).optional()
    })

    // Parse and validate request
    const body = await request.json()
    const validatedEntry = ManualEntrySchema.parse(body)

    // Verify document ownership and get journal ID
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, writing_journal_id')
      .eq('id', documentId)
      .eq('writer_id', user.id)
      .single()

    if (docError) {
      if (docError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
    }

    if (!document.writing_journal_id) {
      return NextResponse.json({ error: 'No journal associated with this document' }, { status: 404 })
    }

    // Create journal entry using the journal service
    const journalService = createJournalService()
    
    try {
      const entry = await journalService.captureEntry(document.writing_journal_id, {
        type: validatedEntry.entry_type,
        content: validatedEntry.content,
        metadata: {
          ...validatedEntry.metadata,
          manual_entry: true,
          document_id: documentId,
          timestamp: new Date().toISOString()
        }
      })

      return NextResponse.json({ entry }, { status: 201 })

    } catch (journalError) {
      console.error('Failed to create journal entry:', journalError)
      return NextResponse.json({ error: 'Failed to create journal entry' }, { status: 500 })
    }

  } catch (error) {
    console.error('Journal entry creation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/documents/[id]/journal
 * Update journal settings (privacy level, summary, etc.)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const documentId = params.id

    const JournalUpdateSchema = z.object({
      privacy_level: z.enum(['private', 'summary', 'public']).optional(),
      summary: z.string().optional()
    })

    // Parse and validate request
    const body = await request.json()
    const validatedUpdate = JournalUpdateSchema.parse(body)

    // Verify document ownership and get journal ID
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, writing_journal_id')
      .eq('id', documentId)
      .eq('writer_id', user.id)
      .single()

    if (docError) {
      if (docError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
    }

    if (!document.writing_journal_id) {
      return NextResponse.json({ error: 'No journal associated with this document' }, { status: 404 })
    }

    // Update journal
    const { data: updatedJournal, error: updateError } = await supabase
      .from('writing_journals')
      .update({
        ...validatedUpdate,
        updated_at: new Date().toISOString()
      })
      .eq('id', document.writing_journal_id)
      .eq('writer_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update journal:', updateError)
      return NextResponse.json({ error: 'Failed to update journal' }, { status: 500 })
    }

    return NextResponse.json({ journal: updatedJournal })

  } catch (error) {
    console.error('Journal update error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}