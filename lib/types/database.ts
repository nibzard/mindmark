/**
 * Database Types for Mindmark Platform
 * Generated from Supabase schema following domain-driven design principles
 */

export interface Database {
  public: {
    Tables: {
      writers: {
        Row: Writer
        Insert: WriterInsert
        Update: WriterUpdate
      }
      documents: {
        Row: Document
        Insert: DocumentInsert
        Update: DocumentUpdate
      }
      writing_journals: {
        Row: WritingJournal
        Insert: WritingJournalInsert
        Update: WritingJournalUpdate
      }
      journal_entries: {
        Row: JournalEntry
        Insert: JournalEntryInsert
        Update: JournalEntryUpdate
      }
      verification_checkpoints: {
        Row: VerificationCheckpoint
        Insert: VerificationCheckpointInsert
        Update: VerificationCheckpointUpdate
      }
      publication_certificates: {
        Row: PublicationCertificate
        Insert: PublicationCertificateInsert
        Update: PublicationCertificateUpdate
      }
      collaborators: {
        Row: Collaborator
        Insert: CollaboratorInsert
        Update: CollaboratorUpdate
      }
    }
    Functions: {
      increment_journal_sequence: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      validate_hash_chain: {
        Args: { journal_uuid: string }
        Returns: boolean
      }
      search_journal_entries: {
        Args: {
          query_embedding: number[]
          match_threshold?: number
          match_count?: number
        }
        Returns: Array<{
          journal_id: string
          entry_id: string
          content: string
          similarity: number
        }>
      }
    }
  }
}

// Domain Types following writing process concepts

/**
 * Writer - Represents a user of the platform
 * Core entity in the writing domain
 */
export interface Writer {
  id: string
  username: string | null
  display_name: string | null
  public_key: string | null  // For cryptographic signatures
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface WriterInsert {
  id?: string  // Made optional for convenience, will be set by auth
  username?: string
  display_name?: string
  public_key?: string
  settings?: Record<string, any>
}

export interface WriterUpdate {
  username?: string
  display_name?: string
  public_key?: string
  settings?: Record<string, any>
  updated_at?: string
}

/**
 * Document - A creative work being written
 * Central entity that has an associated writing journal
 */
export interface Document {
  id: string
  writer_id: string
  title: string | null
  content: LexicalEditorState | null  // Lexical editor state
  writing_journal_id: string | null
  published: boolean
  published_at: string | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface DocumentInsert {
  writer_id: string
  title?: string
  content?: LexicalEditorState
  writing_journal_id?: string
  published?: boolean
  published_at?: string
  metadata?: Record<string, any>
}

export interface DocumentUpdate {
  title?: string
  content?: LexicalEditorState
  writing_journal_id?: string
  published?: boolean
  published_at?: string
  metadata?: Record<string, any>
  updated_at?: string
}

/**
 * WritingJournal - Process capture for a document
 * Contains the complete history of how a document was created
 */
export interface WritingJournal {
  id: string
  document_id: string
  writer_id: string
  entry_count: number
  last_checkpoint_hash: string | null
  last_checkpoint_at: string | null
  privacy_level: PrivacyLevel
  summary: string | null  // AI-generated summary
  summary_embedding: number[] | null  // Vector embedding for search
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface WritingJournalInsert {
  document_id: string
  writer_id: string
  entry_count?: number
  last_checkpoint_hash?: string
  last_checkpoint_at?: string
  privacy_level?: PrivacyLevel
  summary?: string
  summary_embedding?: number[]
  metadata?: Record<string, any>
}

export interface WritingJournalUpdate {
  entry_count?: number
  last_checkpoint_hash?: string
  last_checkpoint_at?: string
  privacy_level?: PrivacyLevel
  summary?: string
  summary_embedding?: number[]
  metadata?: Record<string, any>
  updated_at?: string
}

/**
 * JournalEntry - Individual events in the writing process
 * Append-only log of all interactions and decisions
 */
export interface JournalEntry {
  id: string
  journal_id: string
  sequence: number  // Auto-incremented within journal
  entry_type: JournalEntryType
  content: string | null
  content_hash: string  // SHA-256 for hash chain
  prev_hash: string     // Previous entry hash
  embedding: number[] | null  // Vector for semantic search
  metadata: JournalEntryMetadata
  created_at: string
}

export interface JournalEntryInsert {
  journal_id: string
  entry_type: JournalEntryType
  content?: string
  content_hash: string
  prev_hash: string
  embedding?: number[]
  metadata?: JournalEntryMetadata
}

export interface JournalEntryUpdate {
  // Journal entries are append-only, no updates allowed
  // This type exists for consistency but should not be used
}

/**
 * VerificationCheckpoint - Cryptographic proof points
 * Periodic snapshots of journal state with blockchain witnesses
 */
export interface VerificationCheckpoint {
  id: string
  journal_id: string
  merkle_root: string
  entry_range: [number, number]  // [start_sequence, end_sequence]
  witness_type: WitnessType | null
  witness_proof: string | null  // Transaction ID or Tweet ID
  witness_data: Record<string, any>
  created_at: string
}

export interface VerificationCheckpointInsert {
  journal_id: string
  merkle_root: string
  entry_range: [number, number]
  witness_type?: WitnessType
  witness_proof?: string
  witness_data?: Record<string, any>
}

export interface VerificationCheckpointUpdate {
  witness_type?: WitnessType
  witness_proof?: string
  witness_data?: Record<string, any>
}

/**
 * PublicationCertificate - Verifiable proof of writing process
 * JSON-LD certificates that can be embedded in published works
 */
export interface PublicationCertificate {
  id: string
  document_id: string
  journal_id: string
  certificate_data: CertificateData  // JSON-LD format
  merkle_root: string
  signature: string | null
  public_url: string | null
  verification_metadata: Record<string, any>
  created_at: string
}

export interface PublicationCertificateInsert {
  document_id: string
  journal_id: string
  certificate_data: CertificateData
  merkle_root: string
  signature?: string
  public_url?: string
  verification_metadata?: Record<string, any>
}

export interface PublicationCertificateUpdate {
  certificate_data?: CertificateData
  signature?: string
  public_url?: string
  verification_metadata?: Record<string, any>
}

/**
 * Collaborator - Multi-author document permissions
 * Future feature for team writing projects
 */
export interface Collaborator {
  document_id: string
  writer_id: string
  permission: CollaboratorPermission
  added_by: string | null
  added_at: string
}

export interface CollaboratorInsert {
  document_id: string
  writer_id: string
  permission: CollaboratorPermission
  added_by?: string
}

export interface CollaboratorUpdate {
  permission?: CollaboratorPermission
}

// Enum Types

export type PrivacyLevel = 'private' | 'summary' | 'public'

export type JournalEntryType = 
  | 'prompt'      // AI prompt from user
  | 'response'    // AI response
  | 'decision'    // User decision or choice
  | 'annotation'  // User annotation or note
  | 'revision'    // Text revision or edit
  | 'voice'       // Voice note or annotation

export type WitnessType = 'arweave' | 'twitter' | 'local'

export type CollaboratorPermission = 'read' | 'write' | 'admin'

// Complex Types

/**
 * Lexical Editor State
 * The complete editor state from Lexical framework
 */
export interface LexicalEditorState {
  root: {
    children: Array<any>
    direction: 'ltr' | 'rtl' | null
    format: string
    indent: number
    type: string
    version: number
  }
}

/**
 * Journal Entry Metadata
 * Contextual information about each journal entry
 */
export interface JournalEntryMetadata {
  // AI interaction metadata
  ai_model?: string           // e.g., "gpt-4", "claude-3"
  token_count?: number        // Tokens consumed
  temperature?: number        // AI temperature setting
  
  // Timing metadata
  duration_ms?: number        // Time taken for interaction
  timestamp?: string          // Precise timestamp
  
  // User interaction metadata
  user_action?: string        // Type of user action
  selection_range?: [number, number]  // Text selection
  cursor_position?: number    // Cursor position
  
  // Process metadata
  iteration_count?: number    // Number of revisions
  decision_rationale?: string // Why user made this choice
  confidence_level?: number   // User confidence (1-10)
  
  // Voice annotation metadata
  audio_duration?: number     // Voice note duration
  audio_transcript?: string   // Transcribed text
  
  // Additional contextual data
  [key: string]: any
}

/**
 * Certificate Data (JSON-LD format)
 * Standardized format for publication certificates
 */
export interface CertificateData {
  '@context': string[]
  '@type': 'DigitalDocument' | 'CreativeWork'
  '@id': string
  
  // Document identification
  title: string
  author: {
    '@type': 'Person'
    name: string
    identifier?: string
  }
  dateCreated: string
  datePublished?: string
  
  // Process verification
  writingProcess: {
    '@type': 'CreativeProcess'
    journalId: string
    entryCount: number
    startDate: string
    endDate: string
    aiAssistance: boolean
    checkpointCount: number
  }
  
  // Cryptographic proof
  proof: {
    '@type': 'MerkleProof'
    merkleRoot: string
    hashChain: string[]
    witnessType?: WitnessType
    witnessProof?: string
    signature?: string
  }
  
  // Privacy and disclosure
  disclosureLevel: PrivacyLevel
  summaryGenerated: boolean
  selectiveDisclosure?: string[]
  
  // Verification endpoints
  verificationUrl: string
  apiEndpoint?: string
  
  // Additional metadata
  [key: string]: any
}

// Utility Types

/**
 * Hash Chain Entry
 * Structure for hash chain verification
 */
export interface HashChainEntry {
  sequence: number
  content_hash: string
  prev_hash: string
  timestamp: string
}

/**
 * Merkle Tree Node
 * Structure for Merkle tree construction
 */
export interface MerkleNode {
  hash: string
  left?: MerkleNode
  right?: MerkleNode
  data?: string
}

/**
 * Semantic Search Result
 * Result from vector similarity search
 */
export interface SemanticSearchResult {
  journal_id: string
  entry_id: string
  content: string
  similarity: number
  metadata?: JournalEntryMetadata
}

/**
 * AI Provider Configuration
 * Configuration for different AI models
 */
export interface AIProviderConfig {
  provider: 'openai' | 'anthropic'
  model: string
  api_key: string
  base_url?: string
  default_params?: {
    temperature?: number
    max_tokens?: number
    top_p?: number
    [key: string]: any
  }
}