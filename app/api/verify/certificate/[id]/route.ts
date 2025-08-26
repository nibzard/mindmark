/**
 * Certificate Verification API Route
 * Public endpoint for verifying publication certificates
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { ServerVerificationService } from '@/lib/services/verification'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      .eq('id', params.id)
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
        apiEndpoint: certificate.certificate_data?.apiEndpoint\n      }\n    })\n\n  } catch (error) {\n    console.error('Certificate verification error:', error)\n    return NextResponse.json(\n      { error: 'Internal server error' },\n      { status: 500 }\n    )\n  }\n}\n\nexport async function POST(\n  request: NextRequest,\n  { params }: { params: { id: string } }\n) {\n  try {\n    const supabase = await createSupabaseServerClient()\n    \n    // Get certificate - this is a public endpoint, no auth required\n    const { data: certificate, error: certError } = await supabase\n      .from('publication_certificates')\n      .select('*')\n      .eq('id', params.id)\n      .single()\n\n    if (certError || !certificate) {\n      return NextResponse.json(\n        { error: 'Certificate not found' },\n        { status: 404 }\n      )\n    }\n\n    // Parse request body for verification options\n    let requestData: { includeDetails?: boolean } = {}\n    try {\n      const body = await request.text()\n      if (body) {\n        requestData = JSON.parse(body)\n      }\n    } catch (parseError) {\n      // Ignore parse errors for verification requests\n    }\n\n    // Perform detailed verification\n    const verificationService = new ServerVerificationService()\n    const verificationResult = await verificationService.verifyCertificate(params.id)\n\n    // If hash chain validation is requested, also validate the underlying journal\n    let hashChainValidation = null\n    if (requestData.includeDetails && certificate.journal_id) {\n      try {\n        const isHashChainValid = await verificationService.validateHashChain(certificate.journal_id)\n        hashChainValidation = {\n          isValid: isHashChainValid,\n          journalId: certificate.journal_id,\n          validatedAt: new Date().toISOString()\n        }\n      } catch (hashError) {\n        console.warn('Hash chain validation failed:', hashError)\n        hashChainValidation = {\n          isValid: false,\n          error: 'Hash chain validation unavailable',\n          journalId: certificate.journal_id,\n          validatedAt: new Date().toISOString()\n        }\n      }\n    }\n\n    return NextResponse.json({\n      certificateId: certificate.id,\n      verification: {\n        status: verificationResult.isValid ? 'verified' : 'failed',\n        isValid: verificationResult.isValid,\n        merkleRoot: verificationResult.merkleRoot,\n        checkpointId: verificationResult.checkpointId,\n        witnessProof: verificationResult.witnessProof,\n        errors: verificationResult.errors,\n        verifiedAt: new Date().toISOString()\n      },\n      hashChain: hashChainValidation,\n      message: verificationResult.isValid \n        ? 'Certificate verification successful' \n        : 'Certificate verification failed'\n    })\n\n  } catch (error) {\n    console.error('Certificate verification error:', error)\n    return NextResponse.json(\n      { \n        error: error instanceof Error \n          ? error.message \n          : 'Verification failed' \n      },\n      { status: 500 }\n    )\n  }\n}"