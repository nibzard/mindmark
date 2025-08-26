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
    }\n\n    // Verify the entry exists in the journal\n    const { data: entry, error: entryError } = await supabase\n      .from('journal_entries')\n      .select('id, content_hash, sequence')\n      .eq('journal_id', journalId)\n      .eq('content_hash', entryHash)\n      .single()\n\n    if (entryError || !entry) {\n      return NextResponse.json(\n        { error: 'Journal entry not found' },\n        { status: 404 }\n      )\n    }\n\n    // Generate Merkle proof\n    const verificationService = new ServerVerificationService()\n    const proof = await verificationService.getMerkleProof(journalId, entryHash)\n\n    return NextResponse.json({\n      journalId,\n      entryId: entry.id,\n      entryHash,\n      sequence: entry.sequence,\n      merkleProof: {\n        leaf: proof.leaf,\n        proof: proof.proof,\n        root: proof.root,\n        verified: proof.verified\n      },\n      generatedAt: new Date().toISOString()\n    })\n\n  } catch (error) {\n    console.error('Merkle proof error:', error)\n    return NextResponse.json(\n      { \n        error: error instanceof Error \n          ? error.message \n          : 'Failed to generate Merkle proof' \n      },\n      { status: 500 }\n    )\n  }\n}\n\nexport async function GET(request: NextRequest) {\n  try {\n    const { searchParams } = new URL(request.url)\n    const journalId = searchParams.get('journalId')\n    const entryHash = searchParams.get('entryHash')\n\n    if (!journalId || !entryHash) {\n      return NextResponse.json(\n        { error: 'journalId and entryHash query parameters are required' },\n        { status: 400 }\n      )\n    }\n\n    const supabase = await createSupabaseServerClient()\n\n    // Verify the entry exists (public verification, no auth required)\n    const { data: entry, error: entryError } = await supabase\n      .from('journal_entries')\n      .select('id, content_hash, sequence, created_at')\n      .eq('journal_id', journalId)\n      .eq('content_hash', entryHash)\n      .single()\n\n    if (entryError || !entry) {\n      return NextResponse.json(\n        { error: 'Journal entry not found' },\n        { status: 404 }\n      )\n    }\n\n    // Generate proof for verification\n    const verificationService = new ServerVerificationService()\n    const proof = await verificationService.getMerkleProof(journalId, entryHash)\n\n    return NextResponse.json({\n      journalId,\n      entryId: entry.id,\n      entryHash,\n      sequence: entry.sequence,\n      createdAt: entry.created_at,\n      merkleProof: {\n        leaf: proof.leaf,\n        proofElements: proof.proof.length,\n        root: proof.root,\n        verified: proof.verified,\n        // Don't include the actual proof data in GET requests for security\n        // Full proof available via POST request with authentication\n      },\n      verifiedAt: new Date().toISOString()\n    })\n\n  } catch (error) {\n    console.error('Merkle proof verification error:', error)\n    return NextResponse.json(\n      { \n        error: error instanceof Error \n          ? error.message \n          : 'Failed to verify Merkle proof' \n      },\n      { status: 500 }\n    )\n  }\n}"