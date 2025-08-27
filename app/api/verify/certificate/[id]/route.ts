/**
 * Certificate Verification API Route
 * Public endpoint for verifying publication certificates
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { ServerVerificationService } from '@/lib/services/verification'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get certificate - this is a public endpoint, no auth required
    const { data: certificate, error: certError } = await supabase
      .from('publication_certificates')
      .select(`
        *,
        documents (
          id,
          title
        ),
        writing_journals (
          id,
          entry_count,
          created_at,
          updated_at
        )
      `)
      .eq('id', resolvedParams.id)
      .single()

    if (certError || !certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      )
    }

    // Verify the certificate using the verification service
    const verificationService = new ServerVerificationService()
    const verificationResult = await verificationService.verifyCertificate(params.id)

    // Return certificate with verification status
    return NextResponse.json({
      certificateId: certificate.id,
      documentTitle: certificate.documents?.title,
      author: certificate.certificate_data?.author,
      isValid: verificationResult.isValid,
      merkleRoot: certificate.merkle_root,
      publicUrl: certificate.public_url,
      createdAt: certificate.created_at,
      verification: {
        status: verificationResult.isValid ? 'valid' : 'invalid',
        merkleRoot: verificationResult.merkleRoot,
        checkpointId: verificationResult.checkpointId,
        witnessProof: verificationResult.witnessProof,
        errors: verificationResult.errors,
        verifiedAt: new Date().toISOString()
      },
      certificate: {
        '@context': certificate.certificate_data?.['@context'],
        '@type': certificate.certificate_data?.['@type'],
        '@id': certificate.certificate_data?.['@id'],
        title: certificate.certificate_data?.title,
        author: certificate.certificate_data?.author,
        dateCreated: certificate.certificate_data?.dateCreated,
        datePublished: certificate.certificate_data?.datePublished,
        writingProcess: certificate.certificate_data?.writingProcess,
        proof: certificate.certificate_data?.proof,
        disclosureLevel: certificate.certificate_data?.disclosureLevel,
        verificationUrl: certificate.certificate_data?.verificationUrl,
        apiEndpoint: certificate.certificate_data?.apiEndpoint
      }
    })

  } catch (error) {
    console.error('Certificate verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get certificate - this is a public endpoint, no auth required
    const { data: certificate, error: certError } = await supabase
      .from('publication_certificates')
      .select('*')
      .eq('id', resolvedParams.id)
      .single()

    if (certError || !certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      )
    }

    // Parse request body for verification options
    let requestData: { includeDetails?: boolean } = {}
    try {
      const body = await request.text()
      if (body) {
        requestData = JSON.parse(body)
      }
    } catch (parseError) {
      // Ignore parse errors for verification requests
    }

    // Perform detailed verification
    const verificationService = new ServerVerificationService()
    const verificationResult = await verificationService.verifyCertificate(params.id)

    // If hash chain validation is requested, also validate the underlying journal
    let hashChainValidation = null
    if (requestData.includeDetails && certificate.journal_id) {
      try {
        const isHashChainValid = await verificationService.validateHashChain(certificate.journal_id)
        hashChainValidation = {
          isValid: isHashChainValid,
          journalId: certificate.journal_id,
          validatedAt: new Date().toISOString()
        }
      } catch (hashError) {
        console.warn('Hash chain validation failed:', hashError)
        hashChainValidation = {
          isValid: false,
          error: 'Hash chain validation unavailable',
          journalId: certificate.journal_id,
          validatedAt: new Date().toISOString()
        }
      }
    }

    return NextResponse.json({
      certificateId: certificate.id,
      verification: {
        status: verificationResult.isValid ? 'verified' : 'failed',
        isValid: verificationResult.isValid,
        merkleRoot: verificationResult.merkleRoot,
        checkpointId: verificationResult.checkpointId,
        witnessProof: verificationResult.witnessProof,
        errors: verificationResult.errors,
        verifiedAt: new Date().toISOString()
      },
      hashChain: hashChainValidation,
      message: verificationResult.isValid 
        ? 'Certificate verification successful' 
        : 'Certificate verification failed'
    })

  } catch (error) {
    console.error('Certificate verification error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Verification failed' 
      },
      { status: 500 }
    )
  }
}