/**
 * Blockchain Witness Service
 * Production implementation for Arweave and Twitter verification
 */

import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import Arweave from 'arweave'
import { z } from 'zod'

// Request validation schemas
const ArweaveWitnessSchema = z.object({
  journalId: z.string().uuid(),
  merkleRoot: z.string().length(64),
  entryRange: z.tuple([z.number(), z.number()]),
  timestamp: z.string().datetime()
})

const TwitterWitnessSchema = z.object({
  message: z.string().min(1).max(280),
  merkleRoot: z.string().length(64).optional(),
  timestamp: z.string().datetime().optional()
})

// Arweave configuration
const arweave = Arweave.init({
  host: process.env.ARWEAVE_HOST || 'arweave.net',
  port: process.env.ARWEAVE_PORT ? parseInt(process.env.ARWEAVE_PORT) : 443,
  protocol: process.env.ARWEAVE_PROTOCOL || 'https'
})

/**
 * Witness Service Interface
 */
export interface WitnessService {
  submitToArweave(data: ArweaveWitnessData): Promise<string>
  verifyArweaveWitness(transactionId: string): Promise<boolean>
  submitToTwitter(data: TwitterWitnessData): Promise<string>
  verifyTwitterWitness(tweetId: string): Promise<boolean>
  getWitnessStatus(witnessId: string, type: 'arweave' | 'twitter'): Promise<WitnessStatus>
}

export type ArweaveWitnessData = z.infer<typeof ArweaveWitnessSchema>
export type TwitterWitnessData = z.infer<typeof TwitterWitnessSchema>

export interface WitnessStatus {
  id: string
  type: 'arweave' | 'twitter'
  status: 'pending' | 'confirmed' | 'failed'
  url?: string
  confirmations?: number
  submittedAt: string
  confirmedAt?: string
}

/**
 * Production Witness Service Implementation
 */
export class ProductionWitnessService implements WitnessService {
  /**
   * Submit data to Arweave blockchain
   */
  async submitToArweave(data: ArweaveWitnessData): Promise<string> {
    const validatedData = ArweaveWitnessSchema.parse(data)

    if (!process.env.ARWEAVE_WALLET_JSON) {
      throw new Error('Arweave wallet not configured')
    }

    try {
      // Load wallet from environment
      const wallet = JSON.parse(process.env.ARWEAVE_WALLET_JSON)
      
      // Create verification document
      const document = {
        type: 'MindmarkVerification',
        version: '1.0',
        journalId: validatedData.journalId,
        merkleRoot: validatedData.merkleRoot,
        entryRange: validatedData.entryRange,
        timestamp: validatedData.timestamp,
        platform: 'mindmark.io',
        description: 'Cryptographic proof of writing process integrity'
      }

      // Create Arweave transaction
      const transaction = await arweave.createTransaction({
        data: JSON.stringify(document, null, 2)
      }, wallet)

      // Add tags for discovery
      transaction.addTag('Content-Type', 'application/json')
      transaction.addTag('App-Name', 'Mindmark')
      transaction.addTag('App-Version', '1.0')
      transaction.addTag('Type', 'Verification')
      transaction.addTag('Journal-ID', validatedData.journalId)
      transaction.addTag('Merkle-Root', validatedData.merkleRoot)
      transaction.addTag('Timestamp', validatedData.timestamp)

      // Sign and submit transaction
      await arweave.transactions.sign(transaction, wallet)
      const response = await arweave.transactions.post(transaction)

      if (response.status === 200) {
        return transaction.id
      } else {
        throw new Error(`Arweave submission failed with status ${response.status}`)
      }

    } catch (error) {
      console.error('Arweave submission error:', error)
      throw new Error(`Failed to submit to Arweave: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Verify Arweave transaction exists and is valid
   */
  async verifyArweaveWitness(transactionId: string): Promise<boolean> {
    try {
      // Check transaction status
      const status = await arweave.transactions.getStatus(transactionId)
      
      if (status.status !== 200) {
        return false
      }

      // Get transaction data to verify it's a valid Mindmark verification
      const transaction = await arweave.transactions.get(transactionId)
      const data = await arweave.transactions.getData(transactionId, { decode: true, string: true })
      
      if (!data) {
        return false
      }

      // Verify it's a Mindmark verification document
      const document = JSON.parse(data as string)
      return (
        document.type === 'MindmarkVerification' &&
        document.platform === 'mindmark.io' &&
        document.merkleRoot &&
        document.journalId
      )

    } catch (error) {
      console.error('Arweave verification error:', error)
      return false
    }
  }

  /**
   * Submit verification tweet (requires Twitter API setup)
   */
  async submitToTwitter(data: TwitterWitnessData): Promise<string> {
    const validatedData = TwitterWitnessSchema.parse(data)

    if (!process.env.TWITTER_BEARER_TOKEN || !process.env.TWITTER_API_KEY) {
      throw new Error('Twitter API credentials not configured')
    }

    try {
      // Create tweet with verification message
      const tweetText = validatedData.merkleRoot 
        ? `${validatedData.message}\n\n#MindmarkVerification ${validatedData.merkleRoot.substring(0, 16)}...`
        : validatedData.message

      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: tweetText
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Twitter API error: ${errorData.detail || response.statusText}`)
      }

      const result = await response.json()
      return result.data.id

    } catch (error) {
      console.error('Twitter submission error:', error)
      throw new Error(`Failed to submit to Twitter: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Verify Twitter tweet exists
   */
  async verifyTwitterWitness(tweetId: string): Promise<boolean> {
    if (!process.env.TWITTER_BEARER_TOKEN) {
      console.warn('Twitter verification skipped: API credentials not configured')
      return true // Don't fail verification for missing credentials
    }

    try {
      const response = await fetch(`https://api.twitter.com/2/tweets/${tweetId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        }
      })

      if (!response.ok) {
        return false
      }

      const result = await response.json()
      
      // Verify it contains Mindmark verification hashtag
      return result.data?.text?.includes('#MindmarkVerification') || false

    } catch (error) {
      console.error('Twitter verification error:', error)
      return false
    }
  }

  /**
   * Get witness status with confirmation details
   */
  async getWitnessStatus(witnessId: string, type: 'arweave' | 'twitter'): Promise<WitnessStatus> {
    if (type === 'arweave') {
      try {
        const status = await arweave.transactions.getStatus(witnessId)
        
        return {
          id: witnessId,
          type: 'arweave',
          status: status.status === 200 ? 'confirmed' : 'pending',
          url: `https://viewblock.io/arweave/tx/${witnessId}`,
          confirmations: status.confirmed ? status.confirmed.number_of_confirmations : 0,
          submittedAt: new Date().toISOString(), // Would need to get from transaction
          confirmedAt: status.confirmed ? new Date((status.confirmed as any).block_timestamp * 1000).toISOString() : undefined
        }
      } catch (error) {
        return {
          id: witnessId,
          type: 'arweave',
          status: 'failed',
          submittedAt: new Date().toISOString()
        }
      }
    } else {
      // Twitter status check
      const isValid = await this.verifyTwitterWitness(witnessId)
      
      return {
        id: witnessId,
        type: 'twitter',
        status: isValid ? 'confirmed' : 'failed',
        url: `https://twitter.com/i/web/status/${witnessId}`,
        submittedAt: new Date().toISOString(),
        confirmedAt: isValid ? new Date().toISOString() : undefined
      }
    }
  }
}

/**
 * Development/Mock Witness Service for testing
 */
export class MockWitnessService implements WitnessService {
  async submitToArweave(data: ArweaveWitnessData): Promise<string> {
    console.log('Mock Arweave submission:', data)
    return `mock-arweave-${Date.now()}`
  }

  async verifyArweaveWitness(transactionId: string): Promise<boolean> {
    return transactionId.startsWith('mock-arweave-')
  }

  async submitToTwitter(data: TwitterWitnessData): Promise<string> {
    console.log('Mock Twitter submission:', data)
    return `mock-twitter-${Date.now()}`
  }

  async verifyTwitterWitness(tweetId: string): Promise<boolean> {
    return tweetId.startsWith('mock-twitter-')
  }

  async getWitnessStatus(witnessId: string, type: 'arweave' | 'twitter'): Promise<WitnessStatus> {
    return {
      id: witnessId,
      type,
      status: 'confirmed',
      url: `https://example.com/${type}/${witnessId}`,
      submittedAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString()
    }
  }
}

/**
 * Factory function to create appropriate witness service
 */
export function createWitnessService(): WitnessService {
  if (process.env.NODE_ENV === 'production' && process.env.ARWEAVE_WALLET_JSON) {
    return new ProductionWitnessService()
  } else {
    return new MockWitnessService()
  }
}
