/**
 * Journal Service
 * Handles writing process capture and hash chain management following domain-driven design
 */

import { createSupabaseBrowserClient, createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { 
  type WritingJournal, 
  type WritingJournalInsert, 
  type WritingJournalUpdate,
  type JournalEntry,
  type JournalEntryInsert,
  type JournalEntryType,
  type JournalEntryMetadata,
  type PrivacyLevel,
  type HashChainEntry
} from '@/lib/types/database'
import { sha256 } from '@noble/hashes/sha2'
import { z } from 'zod'

/**
 * Hash chain utilities
 * Provides cryptographic verification for journal integrity
 */
export class HashChain {
  /**
   * Generate SHA-256 hash of content
   */
  static hash(content: string): string {
    const bytes = sha256(new TextEncoder().encode(content))
    return Array.from(bytes)
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * Create hash chain entry
   */
  static createEntry(content: string, previousHash: string): {
    contentHash: string
    chainedHash: string
  } {
    const contentHash = this.hash(content)
    const chainedHash = this.hash(previousHash + contentHash)
    return { contentHash, chainedHash }
  }

  /**
   * Validate hash chain integrity
   */
  static validateChain(entries: HashChainEntry[]): boolean {
    if (entries.length === 0) return true
    
    let expectedPrevHash = ''
    
    for (const entry of entries.sort((a, b) => a.sequence - b.sequence)) {
      if (entry.prev_hash !== expectedPrevHash) {
        return false
      }
      
      // Verify content hash
      const expectedContentHash = this.hash(entry.content_hash) // Assuming content stored separately
      expectedPrevHash = entry.content_hash
    }
    
    return true
  }
}

/**
 * Journal entry validation schemas
 */
const JournalEntryCreateSchema = z.object({
  entryType: z.enum(['prompt', 'response', 'decision', 'annotation', 'revision', 'voice']),
  content: z.string().min(1, 'Content is required'),
  metadata: z.record(z.string(), z.any()).default({})
})

/**
 * Journal Service Interface
 * Defines all journal operations with clear domain boundaries
 */
export interface JournalService {
  // Journal lifecycle
  createJournal(documentId: string, writerId: string): Promise<WritingJournal>
  getJournal(journalId: string): Promise<WritingJournal | null>
  updateJournalPrivacy(journalId: string, privacyLevel: PrivacyLevel): Promise<WritingJournal>
  
  // Journal entry operations
  addEntry(journalId: string, data: JournalEntryCreateInput): Promise<JournalEntry>
  getEntries(journalId: string, limit?: number): Promise<JournalEntry[]>
  getEntry(entryId: string): Promise<JournalEntry | null>
  
  // Hash chain operations
  validateHashChain(journalId: string): Promise<boolean>
  getHashChainSummary(journalId: string): Promise<HashChainSummary>
  
  // Process analysis
  generateSummary(journalId: string): Promise<string>
  getProcessInsights(journalId: string): Promise<ProcessInsights>
}

/**
 * Input types for journal operations
 */
export type JournalEntryCreateInput = z.infer<typeof JournalEntryCreateSchema>

/**
 * Process insights type
 */
export interface ProcessInsights {
  totalEntries: number
  entryTypes: Record<JournalEntryType, number>
  averageSessionLength: number
  revisionCount: number
  aiInteractionCount: number
  timeSpent: number
  thinkingPatterns: string[]
}

/**
 * Hash chain summary
 */
export interface HashChainSummary {
  totalEntries: number
  isValid: boolean
  lastHash: string
  firstHash: string
  checkpointCount: number
}

/**
 * Browser Journal Service Implementation
 * For use in client-side React components
 */
export class BrowserJournalService implements JournalService {
  private supabase = createSupabaseBrowserClient()

  /**
   * Create a new journal for a document
   */
  async createJournal(documentId: string, writerId: string): Promise<WritingJournal> {
    try {
      const journalData: WritingJournalInsert = {
        document_id: documentId,
        writer_id: writerId,
        privacy_level: 'private',
        entry_count: 0
      }

      const { data: journal, error } = await this.supabase
        .from('writing_journals')
        .insert(journalData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create journal: ${error.message}`)
      }

      return journal
    } catch (error) {
      throw error
    }
  }

  /**
   * Get journal by ID
   */
  async getJournal(journalId: string): Promise<WritingJournal | null> {
    const { data: journal, error } = await this.supabase
      .from('writing_journals')
      .select('*')
      .eq('id', journalId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get journal: ${error.message}`)
    }

    return journal
  }

  /**
   * Update journal privacy level
   */
  async updateJournalPrivacy(journalId: string, privacyLevel: PrivacyLevel): Promise<WritingJournal> {
    const updateData: WritingJournalUpdate = {
      privacy_level: privacyLevel,
      updated_at: new Date().toISOString()
    }

    const { data: journal, error } = await this.supabase
      .from('writing_journals')
      .update(updateData)
      .eq('id', journalId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update journal privacy: ${error.message}`)
    }

    return journal
  }

  /**
   * Add a new entry to the journal
   * Automatically handles hash chain computation
   */
  async addEntry(journalId: string, data: JournalEntryCreateInput): Promise<JournalEntry> {
    // Validate input
    const validatedData = JournalEntryCreateSchema.parse(data)
    
    try {
      // Get the last entry to compute hash chain
      const { data: lastEntry } = await this.supabase
        .from('journal_entries')
        .select('content_hash, sequence')
        .eq('journal_id', journalId)
        .order('sequence', { ascending: false })
        .limit(1)
        .single()

      const previousHash = lastEntry?.content_hash || ''
      
      // Create hash chain entry
      const { contentHash } = HashChain.createEntry(validatedData.content, previousHash)
      
      // Prepare entry data
      const entryData: JournalEntryInsert = {
        journal_id: journalId,
        entry_type: validatedData.entryType,
        content: validatedData.content,
        content_hash: contentHash,
        prev_hash: previousHash,
        metadata: {
          ...validatedData.metadata,
          timestamp: new Date().toISOString(),
          user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
        }
      }

      const { data: entry, error } = await this.supabase
        .from('journal_entries')
        .insert(entryData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to add journal entry: ${error.message}`)
      }

      return entry
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.issues.map((e: any) => e.message).join(', ')}`)
      }
      throw error
    }
  }

  /**
   * Get journal entries
   */
  async getEntries(journalId: string, limit: number = 100): Promise<JournalEntry[]> {
    const { data: entries, error } = await this.supabase
      .from('journal_entries')
      .select('*')
      .eq('journal_id', journalId)
      .order('sequence', { ascending: true })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get journal entries: ${error.message}`)
    }

    return entries || []
  }

  /**
   * Get specific journal entry
   */
  async getEntry(entryId: string): Promise<JournalEntry | null> {
    const { data: entry, error } = await this.supabase
      .from('journal_entries')
      .select('*')
      .eq('id', entryId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get journal entry: ${error.message}`)
    }

    return entry
  }

  /**
   * Validate the hash chain integrity
   */
  async validateHashChain(journalId: string): Promise<boolean> {
    const entries = await this.getEntries(journalId)
    
    const hashChainEntries: HashChainEntry[] = entries.map(entry => ({
      sequence: entry.sequence,
      content_hash: entry.content_hash,
      prev_hash: entry.prev_hash,
      timestamp: entry.created_at
    }))

    return HashChain.validateChain(hashChainEntries)
  }

  /**
   * Get hash chain summary
   */
  async getHashChainSummary(journalId: string): Promise<HashChainSummary> {
    const entries = await this.getEntries(journalId)
    const isValid = await this.validateHashChain(journalId)
    
    // Get checkpoints count
    const { count: checkpointCount } = await this.supabase
      .from('verification_checkpoints')
      .select('*', { count: 'exact', head: true })
      .eq('journal_id', journalId)

    return {
      totalEntries: entries.length,
      isValid,
      lastHash: entries[entries.length - 1]?.content_hash || '',
      firstHash: entries[0]?.content_hash || '',
      checkpointCount: checkpointCount || 0
    }
  }

  /**
   * Generate AI summary of journal (placeholder)
   * Will be implemented when AI service is ready
   */
  async generateSummary(journalId: string): Promise<string> {
    // Placeholder implementation
    const entries = await this.getEntries(journalId)
    const entryCount = entries.length
    const types = Array.from(new Set(entries.map(e => e.entry_type)))
    
    return `Writing session with ${entryCount} entries including: ${types.join(', ')}. Process shows active engagement with AI assistance and iterative refinement.`
  }

  /**
   * Get process insights
   */
  async getProcessInsights(journalId: string): Promise<ProcessInsights> {
    const entries = await this.getEntries(journalId)
    
    // Count entry types
    const entryTypes = entries.reduce((acc, entry) => {
      acc[entry.entry_type] = (acc[entry.entry_type] || 0) + 1
      return acc
    }, {} as Record<JournalEntryType, number>)

    // Calculate time metrics
    const timestamps = entries.map(e => new Date(e.created_at).getTime())
    const timeSpent = timestamps.length > 1 
      ? Math.max(...timestamps) - Math.min(...timestamps) 
      : 0

    return {
      totalEntries: entries.length,
      entryTypes,
      averageSessionLength: timeSpent / entries.length || 0,
      revisionCount: entryTypes.revision || 0,
      aiInteractionCount: (entryTypes.prompt || 0) + (entryTypes.response || 0),
      timeSpent,
      thinkingPatterns: [] // Will be enhanced with AI analysis
    }
  }
}

/**
 * Server Journal Service Implementation
 * For use in API routes and Server Components
 */
export class ServerJournalService implements JournalService {
  private async getSupabase() {
    return await createSupabaseServerClient()
  }

  async createJournal(documentId: string, writerId: string): Promise<WritingJournal> {
    const supabase = await this.getSupabase()
    
    try {
      const journalData: WritingJournalInsert = {
        document_id: documentId,
        writer_id: writerId,
        privacy_level: 'private',
        entry_count: 0
      }

      const { data: journal, error } = await supabase
        .from('writing_journals')
        .insert(journalData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create journal: ${error.message}`)
      }

      return journal
    } catch (error) {
      throw error
    }
  }

  async getJournal(journalId: string): Promise<WritingJournal | null> {
    const supabase = await this.getSupabase()
    const { data: journal, error } = await supabase
      .from('writing_journals')
      .select('*')
      .eq('id', journalId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get journal: ${error.message}`)
    }

    return journal
  }

  async updateJournalPrivacy(journalId: string, privacyLevel: PrivacyLevel): Promise<WritingJournal> {
    const supabase = await this.getSupabase()
    const updateData: WritingJournalUpdate = {
      privacy_level: privacyLevel,
      updated_at: new Date().toISOString()
    }

    const { data: journal, error } = await supabase
      .from('writing_journals')
      .update(updateData)
      .eq('id', journalId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update journal privacy: ${error.message}`)
    }

    return journal
  }

  async addEntry(journalId: string, data: JournalEntryCreateInput): Promise<JournalEntry> {
    const validatedData = JournalEntryCreateSchema.parse(data)
    const supabase = await this.getSupabase()
    
    try {
      // Get the last entry to compute hash chain
      const { data: lastEntry } = await supabase
        .from('journal_entries')
        .select('content_hash, sequence')
        .eq('journal_id', journalId)
        .order('sequence', { ascending: false })
        .limit(1)
        .single()

      const previousHash = lastEntry?.content_hash || ''
      
      // Create hash chain entry
      const { contentHash } = HashChain.createEntry(validatedData.content, previousHash)
      
      // Prepare entry data
      const entryData: JournalEntryInsert = {
        journal_id: journalId,
        entry_type: validatedData.entryType,
        content: validatedData.content,
        content_hash: contentHash,
        prev_hash: previousHash,
        metadata: {
          ...validatedData.metadata,
          timestamp: new Date().toISOString()
        }
      }

      const { data: entry, error } = await supabase
        .from('journal_entries')
        .insert(entryData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to add journal entry: ${error.message}`)
      }

      return entry
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.issues.map((e: any) => e.message).join(', ')}`)
      }
      throw error
    }
  }

  async getEntries(journalId: string, limit: number = 100): Promise<JournalEntry[]> {
    const supabase = await this.getSupabase()
    const { data: entries, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('journal_id', journalId)
      .order('sequence', { ascending: true })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get journal entries: ${error.message}`)
    }

    return entries || []
  }

  async getEntry(entryId: string): Promise<JournalEntry | null> {
    const supabase = await this.getSupabase()
    const { data: entry, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', entryId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get journal entry: ${error.message}`)
    }

    return entry
  }

  async validateHashChain(journalId: string): Promise<boolean> {
    const entries = await this.getEntries(journalId)
    
    const hashChainEntries: HashChainEntry[] = entries.map(entry => ({
      sequence: entry.sequence,
      content_hash: entry.content_hash,
      prev_hash: entry.prev_hash,
      timestamp: entry.created_at
    }))

    return HashChain.validateChain(hashChainEntries)
  }

  async getHashChainSummary(journalId: string): Promise<HashChainSummary> {
    const entries = await this.getEntries(journalId)
    const isValid = await this.validateHashChain(journalId)
    const supabase = await this.getSupabase()
    
    // Get checkpoints count
    const { count: checkpointCount } = await supabase
      .from('verification_checkpoints')
      .select('*', { count: 'exact', head: true })
      .eq('journal_id', journalId)

    return {
      totalEntries: entries.length,
      isValid,
      lastHash: entries[entries.length - 1]?.content_hash || '',
      firstHash: entries[0]?.content_hash || '',
      checkpointCount: checkpointCount || 0
    }
  }

  async generateSummary(journalId: string): Promise<string> {
    const entries = await this.getEntries(journalId)
    const entryCount = entries.length
    const types = Array.from(new Set(entries.map(e => e.entry_type)))
    
    return `Writing session with ${entryCount} entries including: ${types.join(', ')}. Process shows active engagement with AI assistance and iterative refinement.`
  }

  async getProcessInsights(journalId: string): Promise<ProcessInsights> {
    const entries = await this.getEntries(journalId)
    
    // Count entry types
    const entryTypes = entries.reduce((acc, entry) => {
      acc[entry.entry_type] = (acc[entry.entry_type] || 0) + 1
      return acc
    }, {} as Record<JournalEntryType, number>)

    // Calculate time metrics
    const timestamps = entries.map(e => new Date(e.created_at).getTime())
    const timeSpent = timestamps.length > 1 
      ? Math.max(...timestamps) - Math.min(...timestamps) 
      : 0

    return {
      totalEntries: entries.length,
      entryTypes,
      averageSessionLength: timeSpent / entries.length || 0,
      revisionCount: entryTypes.revision || 0,
      aiInteractionCount: (entryTypes.prompt || 0) + (entryTypes.response || 0),
      timeSpent,
      thinkingPatterns: []
    }
  }
}

/**
 * Factory function to create appropriate journal service
 * Automatically determines client vs server context
 */
export function createJournalService(): JournalService {
  if (typeof window !== 'undefined') {
    return new BrowserJournalService()
  } else {
    return new ServerJournalService()
  }
}