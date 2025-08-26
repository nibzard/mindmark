/**
 * Verification Service
 * Handles cryptographic verification, Merkle trees, and blockchain witnesses
 */

import { createSupabaseBrowserClient, createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { MerkleTree } from 'merkletreejs'
import { sha256 } from '@noble/hashes/sha2'
import { z } from 'zod'

import {
  type VerificationCheckpoint,
  type VerificationCheckpointInsert,
  type PublicationCertificate,
  type PublicationCertificateInsert,
  type JournalEntry,
  type CertificateData,
  type WitnessType,
  type HashChainEntry
} from '@/lib/types/database'

/**
 * Merkle Proof Structure
 */
export interface MerkleProof {
  leaf: string
  proof: Array<{
    position: 'left' | 'right'
    data: string
  }>
  root: string
  verified: boolean
}

/**
 * Verification Result
 */
export interface VerificationResult {
  isValid: boolean
  merkleRoot?: string
  checkpointId?: string
  witnessProof?: string
  errors?: string[]
}

/**
 * Certificate Creation Request
 */
const CertificateRequestSchema = z.object({
  documentId: z.string().uuid(),
  journalId: z.string().uuid(),
  title: z.string().min(1),
  author: z.object({
    name: z.string().min(1),
    identifier: z.string().optional()
  }),
  disclosureLevel: z.enum(['private', 'summary', 'public']),
  witnessType: z.enum(['arweave', 'twitter', 'local']).optional()
})

/**
 * Verification Service Interface
 */
export interface VerificationService {
  // Merkle tree operations
  generateMerkleTree(journalId: string): Promise<MerkleTree>
  createCheckpoint(journalId: string, witnessType?: WitnessType): Promise<VerificationCheckpoint>
  verifyCheckpoint(checkpointId: string): Promise<VerificationResult>
  
  // Certificate operations
  generateCertificate(request: CertificateRequest): Promise<PublicationCertificate>
  verifyCertificate(certificateId: string): Promise<VerificationResult>
  
  // Hash chain verification
  validateHashChain(journalId: string): Promise<boolean>
  getMerkleProof(journalId: string, entryHash: string): Promise<MerkleProof>
  
  // Witness operations
  submitToArweave(data: any): Promise<string>
  submitToTwitter(message: string): Promise<string>
}

export type CertificateRequest = z.infer<typeof CertificateRequestSchema>

/**
 * Browser Verification Service Implementation
 */
export class BrowserVerificationService implements VerificationService {
  private supabase = createSupabaseBrowserClient()

  /**
   * Generate Merkle tree from journal entries
   */
  async generateMerkleTree(journalId: string): Promise<MerkleTree> {
    // Get all journal entries for this journal
    const { data: entries, error } = await this.supabase
      .from('journal_entries')
      .select('content_hash, sequence')
      .eq('journal_id', journalId)
      .order('sequence', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch journal entries: ${error.message}`)
    }

    if (!entries || entries.length === 0) {
      throw new Error('No journal entries found')
    }

    // Create leaf nodes from content hashes
    const leaves = entries.map(entry => Buffer.from(entry.content_hash, 'hex'))
    
    // Generate Merkle tree
    const tree = new MerkleTree(leaves, sha256, {
      sortPairs: true,
      hashLeaves: false // Hashes are already computed
    })

    return tree
  }

  /**
   * Create verification checkpoint
   */
  async createCheckpoint(journalId: string, witnessType?: WitnessType): Promise<VerificationCheckpoint> {
    try {
      // Generate Merkle tree
      const tree = await this.generateMerkleTree(journalId)
      const merkleRoot = tree.getRoot().toString('hex')

      // Get entry range
      const { data: entries } = await this.supabase
        .from('journal_entries')
        .select('sequence')
        .eq('journal_id', journalId)
        .order('sequence', { ascending: true })

      if (!entries || entries.length === 0) {
        throw new Error('No entries found for checkpoint')
      }

      const entryRange: [number, number] = [entries[0].sequence, entries[entries.length - 1].sequence]

      // Prepare checkpoint data
      const checkpointData: VerificationCheckpointInsert = {
        journal_id: journalId,
        merkle_root: merkleRoot,
        entry_range: entryRange,
        witness_type: witnessType || 'local'
      }

      // Submit to blockchain witness if specified
      let witnessProof: string | undefined
      if (witnessType === 'arweave') {
        witnessProof = await this.submitToArweave({
          journalId,
          merkleRoot,
          entryRange,
          timestamp: new Date().toISOString()
        })
        checkpointData.witness_proof = witnessProof
      } else if (witnessType === 'twitter') {
        const message = `Mindmark document verification: ${merkleRoot.substring(0, 16)}... at ${new Date().toISOString()}`
        witnessProof = await this.submitToTwitter(message)
        checkpointData.witness_proof = witnessProof
      }

      // Save checkpoint to database
      const { data: checkpoint, error } = await this.supabase
        .from('verification_checkpoints')
        .insert(checkpointData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create checkpoint: ${error.message}`)
      }

      return checkpoint
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to create checkpoint')
    }
  }

  /**
   * Verify checkpoint integrity
   */
  async verifyCheckpoint(checkpointId: string): Promise<VerificationResult> {
    try {
      // Get checkpoint data
      const { data: checkpoint, error } = await this.supabase
        .from('verification_checkpoints')
        .select('*')
        .eq('id', checkpointId)
        .single()

      if (error || !checkpoint) {
        return { isValid: false, errors: ['Checkpoint not found'] }
      }

      // Regenerate Merkle tree for verification
      const tree = await this.generateMerkleTree(checkpoint.journal_id)
      const computedRoot = tree.getRoot().toString('hex')

      // Verify Merkle root matches
      const rootMatches = computedRoot === checkpoint.merkle_root

      // Verify witness proof if available
      let witnessValid = true
      if (checkpoint.witness_type === 'arweave' && checkpoint.witness_proof) {
        witnessValid = await this.verifyArweaveWitness(checkpoint.witness_proof)
      } else if (checkpoint.witness_type === 'twitter' && checkpoint.witness_proof) {
        witnessValid = await this.verifyTwitterWitness(checkpoint.witness_proof)
      }

      return {
        isValid: rootMatches && witnessValid,
        merkleRoot: checkpoint.merkle_root,
        checkpointId,
        witnessProof: checkpoint.witness_proof || undefined,
        errors: rootMatches && witnessValid ? undefined : ['Verification failed']
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Verification error']
      }
    }
  }

  /**
   * Generate publication certificate
   */
  async generateCertificate(request: CertificateRequest): Promise<PublicationCertificate> {
    const validatedRequest = CertificateRequestSchema.parse(request)

    try {
      // Create checkpoint if needed
      const checkpoint = await this.createCheckpoint(
        validatedRequest.journalId,
        validatedRequest.witnessType
      )

      // Get journal stats
      const { data: journal } = await this.supabase
        .from('writing_journals')
        .select('entry_count, created_at, updated_at')
        .eq('id', validatedRequest.journalId)
        .single()

      if (!journal) {
        throw new Error('Journal not found')
      }

      // Create certificate data (JSON-LD format)
      const certificateData: CertificateData = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://schema.org/',
          'https://mindmark.io/contexts/v1'
        ],
        '@type': 'DigitalDocument',
        '@id': `https://mindmark.io/certificates/${crypto.randomUUID()}`,
        
        // Document identification
        title: validatedRequest.title,
        author: {
          '@type': 'Person',
          ...validatedRequest.author
        },
        dateCreated: journal.created_at,
        datePublished: new Date().toISOString(),
        
        // Process verification
        writingProcess: {
          '@type': 'CreativeProcess',
          journalId: validatedRequest.journalId,
          entryCount: journal.entry_count,
          startDate: journal.created_at,
          endDate: journal.updated_at,
          aiAssistance: true,
          checkpointCount: 1
        },
        
        // Cryptographic proof
        proof: {
          '@type': 'MerkleProof',
          merkleRoot: checkpoint.merkle_root,
          hashChain: [], // Will be populated if needed
          witnessType: checkpoint.witness_type || undefined,
          witnessProof: checkpoint.witness_proof || undefined
        },
        
        // Privacy and disclosure
        disclosureLevel: validatedRequest.disclosureLevel,
        summaryGenerated: validatedRequest.disclosureLevel !== 'private',
        
        // Verification endpoints
        verificationUrl: `https://mindmark.io/verify/${checkpoint.id}`,
        apiEndpoint: `/api/verify/certificate/${checkpoint.id}`
      }

      // Save certificate
      const certificateInsert: PublicationCertificateInsert = {
        document_id: validatedRequest.documentId,
        journal_id: validatedRequest.journalId,
        certificate_data: certificateData,
        merkle_root: checkpoint.merkle_root,
        public_url: certificateData.verificationUrl
      }

      const { data: certificate, error } = await this.supabase
        .from('publication_certificates')
        .insert(certificateInsert)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create certificate: ${error.message}`)
      }

      return certificate
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to generate certificate')
    }
  }

  /**
   * Verify certificate
   */
  async verifyCertificate(certificateId: string): Promise<VerificationResult> {
    try {
      const { data: certificate, error } = await this.supabase
        .from('publication_certificates')
        .select('*')
        .eq('id', certificateId)
        .single()

      if (error || !certificate) {
        return { isValid: false, errors: ['Certificate not found'] }
      }

      // Find associated checkpoint
      const { data: checkpoint } = await this.supabase
        .from('verification_checkpoints')
        .select('id')
        .eq('merkle_root', certificate.merkle_root)
        .eq('journal_id', certificate.journal_id)
        .single()

      if (!checkpoint) {
        return { isValid: false, errors: ['Associated checkpoint not found'] }
      }

      // Verify the checkpoint
      return await this.verifyCheckpoint(checkpoint.id)
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Certificate verification failed']
      }
    }
  }

  /**
   * Validate hash chain integrity
   */
  async validateHashChain(journalId: string): Promise<boolean> {
    try {
      const { data: entries, error } = await this.supabase
        .from('journal_entries')
        .select('content_hash, prev_hash, sequence')
        .eq('journal_id', journalId)
        .order('sequence', { ascending: true })

      if (error || !entries) {
        return false
      }

      let expectedPrevHash = ''
      for (const entry of entries) {
        if (entry.prev_hash !== expectedPrevHash) {
          return false
        }
        expectedPrevHash = entry.content_hash
      }

      return true
    } catch {
      return false
    }
  }

  /**
   * Get Merkle proof for specific entry
   */
  async getMerkleProof(journalId: string, entryHash: string): Promise<MerkleProof> {
    try {
      const tree = await this.generateMerkleTree(journalId)
      const leaf = Buffer.from(entryHash, 'hex')
      const proof = tree.getProof(leaf)
      const root = tree.getRoot().toString('hex')
      const verified = tree.verify(proof, leaf, tree.getRoot())

      return {
        leaf: entryHash,
        proof: proof.map(p => ({
          position: p.position as 'left' | 'right',
          data: p.data.toString('hex')
        })),
        root,
        verified
      }
    } catch (error) {
      throw new Error(`Failed to generate Merkle proof: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Submit to Arweave via witness service
   */
  async submitToArweave(data: any): Promise<string> {
    const { createWitnessService } = await import('./witness')
    const witnessService = createWitnessService()
    
    return await witnessService.submitToArweave({
      journalId: data.journalId,
      merkleRoot: data.merkleRoot,
      entryRange: data.entryRange,
      timestamp: data.timestamp
    })
  }

  /**
   * Submit to Twitter via witness service
   */
  async submitToTwitter(message: string): Promise<string> {
    const { createWitnessService } = await import('./witness')
    const witnessService = createWitnessService()
    
    return await witnessService.submitToTwitter({
      message,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Verify Arweave witness via witness service
   */
  private async verifyArweaveWitness(transactionId: string): Promise<boolean> {
    try {
      const { createWitnessService } = await import('./witness')
      const witnessService = createWitnessService()
      return await witnessService.verifyArweaveWitness(transactionId)
    } catch {
      return false
    }
  }

  /**
   * Verify Twitter witness via witness service
   */
  private async verifyTwitterWitness(tweetId: string): Promise<boolean> {
    try {
      const { createWitnessService } = await import('./witness')
      const witnessService = createWitnessService()
      return await witnessService.verifyTwitterWitness(tweetId)
    } catch {
      return false
    }
  }
}

/**
 * Server Verification Service Implementation
 */
export class ServerVerificationService extends BrowserVerificationService {
  private async getSupabase() {
    return await createSupabaseServerClient()
  }

  // Server implementation can extend browser with additional capabilities
  // like direct blockchain access, batch processing, etc.
}

/**
 * Factory function to create appropriate verification service
 */
export function createVerificationService(): VerificationService {
  if (typeof window !== 'undefined') {
    return new BrowserVerificationService()
  } else {
    return new ServerVerificationService()
  }
}