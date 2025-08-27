/**
 * Merkle Proof Generation and Verification API Route
 * Generates and verifies Merkle proofs for individual journal entries
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { ServerVerificationService } from '@/lib/services/verification'

interface MerkleProofRequest {
  journalId: string
  entryHash: string
  action?: 'generate' | 'verify'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Parse request body
    let requestData: MerkleProofRequest
    try {
      requestData = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!requestData.journalId || !requestData.entryHash) {
      return NextResponse.json(
        { error: 'journalId and entryHash are required' },
        { status: 400 }
      )
    }

    const { journalId, entryHash, action = 'generate' } = requestData

    // For proof generation, require authentication
    if (action === 'generate') {
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
        .eq('id', journalId)
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
    }

    // Verify the entry exists in the journal
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .select('id, content_hash, sequence')
      .eq('journal_id', journalId)
      .eq('content_hash', entryHash)
      .single()

    if (entryError || !entry) {
      return NextResponse.json(
        { error: 'Journal entry not found' },
        { status: 404 }
      )
    }

    // Generate Merkle proof
    const verificationService = new ServerVerificationService()
    const proof = await verificationService.getMerkleProof(journalId, entryHash)

    return NextResponse.json({
      journalId,
      entryId: entry.id,
      entryHash,
      sequence: entry.sequence,
      merkleProof: {
        leaf: proof.leaf,
        proof: proof.proof,
        root: proof.root,
        verified: proof.verified
      },
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Merkle proof error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Failed to generate Merkle proof' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const journalId = searchParams.get('journalId')
    const entryHash = searchParams.get('entryHash')

    if (!journalId || !entryHash) {
      return NextResponse.json(
        { error: 'journalId and entryHash query parameters are required' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()

    // Verify the entry exists (public verification, no auth required)
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .select('id, content_hash, sequence, created_at')
      .eq('journal_id', journalId)
      .eq('content_hash', entryHash)
      .single()

    if (entryError || !entry) {
      return NextResponse.json(
        { error: 'Journal entry not found' },
        { status: 404 }
      )
    }

    // Generate proof for verification
    const verificationService = new ServerVerificationService()
    const proof = await verificationService.getMerkleProof(journalId, entryHash)

    return NextResponse.json({
      journalId,
      entryId: entry.id,
      entryHash,
      sequence: entry.sequence,
      createdAt: entry.created_at,
      merkleProof: {
        leaf: proof.leaf,
        proofElements: proof.proof.length,
        root: proof.root,
        verified: proof.verified,
        // Don't include the actual proof data in GET requests for security
        // Full proof available via POST request with authentication
      },
      verifiedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Merkle proof verification error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Failed to verify Merkle proof' 
      },
      { status: 500 }
    )
  }
}