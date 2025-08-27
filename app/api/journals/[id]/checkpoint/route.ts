/**
 * Checkpoint Creation API Route
 * Creates cryptographic checkpoints using Merkle trees for journal verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { ServerVerificationService } from '@/lib/services/verification'
import type { WitnessType } from '@/lib/types/database'

interface CheckpointRequest {
  witnessType?: WitnessType
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
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
      .eq('id', resolvedParams.id)
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

    // Check if journal has entries
    if (journal.entry_count === 0) {
      return NextResponse.json(
        { error: 'Cannot create checkpoint for journal with no entries' },
        { status: 400 }
      )
    }

    // Parse request body
    let requestData: CheckpointRequest = {}
    try {
      const body = await request.text()
      if (body) {
        requestData = JSON.parse(body)
      }
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Create checkpoint
    const verificationService = new ServerVerificationService()
    const checkpoint = await verificationService.createCheckpoint(
      resolvedParams.id,
      requestData.witnessType || 'local'
    )

    return NextResponse.json({
      checkpointId: checkpoint.id,
      journalId: resolvedParams.id,
      merkleRoot: checkpoint.merkle_root,
      entryRange: checkpoint.entry_range,
      witnessType: checkpoint.witness_type,
      witnessProof: checkpoint.witness_proof,
      createdAt: checkpoint.created_at
    })

  } catch (error) {
    console.error('Checkpoint creation error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Failed to create checkpoint' 
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
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
      .eq('id', resolvedParams.id)
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

    // Get all checkpoints for this journal
    const { data: checkpoints, error: checkpointsError } = await supabase
      .from('verification_checkpoints')
      .select('*')
      .eq('journal_id', resolvedParams.id)
      .order('created_at', { ascending: false })

    if (checkpointsError) {
      throw checkpointsError
    }

    return NextResponse.json({
      journalId: resolvedParams.id,
      checkpoints: checkpoints || [],
      totalCheckpoints: checkpoints?.length || 0
    })

  } catch (error) {
    console.error('Checkpoint retrieval error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}