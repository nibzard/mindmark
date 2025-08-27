/**
 * Documents API Route
 * Handles CRUD operations for documents
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { createJournalService } from '@/lib/services/journal'
import { z } from 'zod'

// Validation schemas
const CreateDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  content: z.any().optional(), // Lexical editor state
  metadata: z.record(z.any()).optional()
})

const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.any().optional(),
  published: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
})

/**
 * GET /api/documents
 * List user's documents with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const published = searchParams.get('published')
    const search = searchParams.get('search')

    // Build query
    let query = supabase
      .from('documents')
      .select(`
        id,
        title,
        content,
        published,
        published_at,
        metadata,
        created_at,
        updated_at,
        writing_journals (
          id,
          entry_count,
          privacy_level,
          last_checkpoint_at
        )
      `)
      .eq('writer_id', user.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (published !== null) {
      query = query.eq('published', published === 'true')
    }

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    const { data: documents, error, count } = await query

    if (error) {
      console.error('Failed to fetch documents:', error)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    return NextResponse.json({
      documents: documents || [],
      count,
      hasMore: (offset + limit) < (count || 0)
    })

  } catch (error) {
    console.error('Documents API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/documents
 * Create a new document with associated journal
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Parse and validate request
    const body = await request.json()
    const validatedData = CreateDocumentSchema.parse(body)

    // Create document and journal in a transaction
    const { data, error } = await supabase.rpc('create_document_with_journal', {
      p_writer_id: user.id,
      p_title: validatedData.title,
      p_content: validatedData.content || null,
      p_metadata: validatedData.metadata || {}
    })

    if (error) {
      console.error('Failed to create document:', error)
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
    }

    // If RPC doesn't exist, create manually
    if (!data) {
      // Create journal first
      const { data: journal, error: journalError } = await supabase
        .from('writing_journals')
        .insert({
          writer_id: user.id,
          privacy_level: 'private'
        })
        .select()
        .single()

      if (journalError) {
        console.error('Failed to create journal:', journalError)
        return NextResponse.json({ error: 'Failed to create journal' }, { status: 500 })
      }

      // Create document
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          writer_id: user.id,
          title: validatedData.title,
          content: validatedData.content,
          writing_journal_id: journal.id,
          metadata: validatedData.metadata
        })
        .select(`
          id,
          title,
          content,
          published,
          published_at,
          metadata,
          created_at,
          updated_at,
          writing_journals (
            id,
            entry_count,
            privacy_level
          )
        `)
        .single()

      if (docError) {
        console.error('Failed to create document:', docError)
        // Cleanup journal if document creation failed
        await supabase.from('writing_journals').delete().eq('id', journal.id)
        return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
      }

      // Initialize journal service and create initial entry
      const journalService = createJournalService()
      try {
        await journalService.addEntry(journal.id, {
          entryType: 'annotation',
          content: `Document created: "${validatedData.title}"`,
          metadata: {
            action: 'document_created',
            documentId: document.id,
            timestamp: new Date().toISOString()
          }
        })
      } catch (journalError) {
        console.warn('Failed to create initial journal entry:', journalError)
        // Don't fail document creation for this
      }

      return NextResponse.json({ document }, { status: 201 })
    }

    return NextResponse.json({ document: data }, { status: 201 })

  } catch (error) {
    console.error('Document creation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}