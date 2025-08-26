/**
 * Hash Chain Validation API Route
 * Validates the cryptographic integrity of a journal's hash chain
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { ServerJournalService } from '@/lib/services/journal'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify journal ownership
    const { data: journal, error: journalError } = await supabase
      .from('writing_journals')
      .select('id, writer_id, entry_count')
      .eq('id', params.id)
      .single()

    if (journalError || !journal) {
      return NextResponse.json(
        { error: 'Journal not found' },
        { status: 404 }
      )
    }

    if (journal.writer_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Validate hash chain
    const journalService = new ServerJournalService()
    const [isValid, summary] = await Promise.all([
      journalService.validateHashChain(params.id),
      journalService.getHashChainSummary(params.id)
    ])

    return NextResponse.json({
      journalId: params.id,
      isValid,
      totalEntries: summary.totalEntries,
      checkpointCount: summary.checkpointCount,
      firstHash: summary.firstHash,
      lastHash: summary.lastHash,
      validatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Hash chain validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify journal ownership
    const { data: journal, error: journalError } = await supabase
      .from('writing_journals')
      .select('id, writer_id')
      .eq('id', params.id)
      .single()

    if (journalError || !journal) {
      return NextResponse.json(
        { error: 'Journal not found' },
        { status: 404 }
      )
    }

    if (journal.writer_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Re-validate and update validation timestamp
    const journalService = new ServerJournalService()
    const isValid = await journalService.validateHashChain(params.id)

    // Could store validation result in database for audit trail
    // For now, just return the result

    return NextResponse.json({
      journalId: params.id,
      isValid,
      message: isValid 
        ? 'Hash chain validation passed' 
        : 'Hash chain validation failed - integrity compromised',
      validatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Hash chain validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}