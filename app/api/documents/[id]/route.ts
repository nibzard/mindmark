/**
 * Individual Document API Route
 * Handles operations on specific documents
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { createJournalService } from '@/lib/services/journal'
import { z } from 'zod'

// Validation schemas
const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.any().optional(),
  published: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
})

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/documents/[id]
 * Get a specific document with journal information
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

    // Fetch document with journal and recent entries
    const { data: document, error } = await supabase
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
          last_checkpoint_at,
          summary,
          journal_entries (
            id,
            sequence,
            entry_type,
            content,
            metadata,
            created_at
          )
        )
      `)
      .eq('id', documentId)
      .eq('writer_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }
      console.error('Failed to fetch document:', error)
      return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
    }

    return NextResponse.json({ document })

  } catch (error) {
    console.error('Document fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/documents/[id]
 * Update a document and create journal entry
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

    // Parse and validate request
    const body = await request.json()
    const validatedData = UpdateDocumentSchema.parse(body)

    // Check document ownership
    const { data: existingDoc, error: fetchError } = await supabase
      .from('documents')
      .select('id, title, content, writing_journal_id')
      .eq('id', documentId)
      .eq('writer_id', user.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
    }

    // Update document
    const { data: document, error: updateError } = await supabase
      .from('documents')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .eq('writer_id', user.id)
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

    if (updateError) {
      console.error('Failed to update document:', updateError)
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
    }

    // Create journal entry for the update
    if (existingDoc.writing_journal_id) {
      const journalService = createJournalService()
      try {
        const changes = []
        
        if (validatedData.title && validatedData.title !== existingDoc.title) {
          changes.push(`Title changed from "${existingDoc.title}" to "${validatedData.title}"`)
        }
        
        if (validatedData.content) {
          changes.push('Content updated')
        }
        
        if (validatedData.published !== undefined) {
          changes.push(`Document ${validatedData.published ? 'published' : 'unpublished'}`)
        }

        if (changes.length > 0) {
          await journalService.captureEntry(existingDoc.writing_journal_id, {
            type: 'revision',
            content: changes.join('; '),
            metadata: {
              action: 'document_updated',
              documentId,
              changes,
              timestamp: new Date().toISOString()
            }
          })
        }
      } catch (journalError) {
        console.warn('Failed to create journal entry for update:', journalError)
        // Don't fail the update for this
      }
    }

    return NextResponse.json({ document })

  } catch (error) {
    console.error('Document update error:', error)
    
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
 * DELETE /api/documents/[id]
 * Delete a document and its associated journal
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const documentId = params.id

    // Check document ownership and get journal ID
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('id, title, writing_journal_id')
      .eq('id', documentId)
      .eq('writer_id', user.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
    }

    // Delete document (journal will be deleted via CASCADE)
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('writer_id', user.id)

    if (deleteError) {
      console.error('Failed to delete document:', deleteError)
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Document "${document.title}" deleted successfully` 
    })

  } catch (error) {
    console.error('Document deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}