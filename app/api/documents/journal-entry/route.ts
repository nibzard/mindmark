/**
 * Journal Entry API Route
 * Handles creation of journal entries from AI service and other sources
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { createJournalService } from '@/lib/services/journal'
import { z } from 'zod'

// Validation schema
const JournalEntryRequestSchema = z.object({
  journalId: z.string().uuid(),
  entry_type: z.enum(['prompt', 'response', 'decision', 'annotation', 'revision', 'voice']),
  content: z.string().min(1),
  metadata: z.record(z.any()).optional()
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

    // Parse and validate request
    const body = await request.json()
    const validatedData = JournalEntryRequestSchema.parse(body)

    // Verify journal ownership
    const { data: journal, error: journalError } = await supabase
      .from('writing_journals')
      .select('id, writer_id')
      .eq('id', validatedData.journalId)
      .single()

    if (journalError) {
      if (journalError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Journal not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to verify journal' },
        { status: 500 }
      )
    }

    if (journal.writer_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Create journal entry
    const journalService = createJournalService()
    
    const entry = await journalService.addEntry(validatedData.journalId, {
      entryType: validatedData.entry_type,
      content: validatedData.content,
      metadata: {
        ...validatedData.metadata,
        created_by: 'api',
        user_id: user.id,
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json({ entry }, { status: 201 })

  } catch (error) {
    console.error('Journal entry creation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}