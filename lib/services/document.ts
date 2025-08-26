/**
 * Document Service
 * Handles document creation, editing, and management following domain-driven design
 */

import { createSupabaseBrowserClient, createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { 
  type Document, 
  type DocumentInsert, 
  type DocumentUpdate,
  type LexicalEditorState 
} from '@/lib/types/database'
import { z } from 'zod'

/**
 * Document validation schemas
 * Ensures data integrity and type safety
 */
const DocumentCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.any().optional(), // Lexical editor state
  published: z.boolean().default(false)
})

const DocumentUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.any().optional(),
  published: z.boolean().optional(),
  published_at: z.string().datetime().optional()
})

/**
 * Document Service Interface
 * Defines all document operations with clear domain boundaries
 */
export interface DocumentService {
  // Document lifecycle
  createDocument(writerId: string, data: DocumentCreateInput): Promise<Document>
  updateDocument(documentId: string, data: DocumentUpdateInput): Promise<Document>
  deleteDocument(documentId: string): Promise<void>
  
  // Document retrieval
  getDocument(documentId: string): Promise<Document | null>
  getDocumentsByWriter(writerId: string): Promise<Document[]>
  getPublishedDocuments(limit?: number): Promise<Document[]>
  
  // Document operations
  publishDocument(documentId: string): Promise<Document>
  unpublishDocument(documentId: string): Promise<Document>
  duplicateDocument(documentId: string, newTitle?: string): Promise<Document>
  
  // Auto-save functionality
  autoSave(documentId: string, content: LexicalEditorState): Promise<void>
}

/**
 * Input types for document operations
 */
export type DocumentCreateInput = z.infer<typeof DocumentCreateSchema>
export type DocumentUpdateInput = z.infer<typeof DocumentUpdateSchema>

/**
 * Browser Document Service Implementation
 * For use in client-side React components
 */
export class BrowserDocumentService implements DocumentService {
  private supabase = createSupabaseBrowserClient()

  /**
   * Create a new document
   * Automatically creates an associated writing journal
   */
  async createDocument(writerId: string, data: DocumentCreateInput): Promise<Document> {
    // Validate input
    const validatedData = DocumentCreateSchema.parse(data)
    
    try {
      // Create document
      const documentData: DocumentInsert = {
        writer_id: writerId,
        title: validatedData.title,
        content: validatedData.content || null,
        published: validatedData.published || false
      }

      const { data: document, error } = await this.supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create document: ${error.message}`)
      }

      return document
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.issues.map((e: any) => e.message).join(', ')}`)
      }
      throw error
    }
  }

  /**
   * Update an existing document
   */
  async updateDocument(documentId: string, data: DocumentUpdateInput): Promise<Document> {
    // Validate input
    const validatedData = DocumentUpdateSchema.parse(data)
    
    try {
      const updateData: DocumentUpdate = {
        ...validatedData,
        updated_at: new Date().toISOString()
      }

      const { data: document, error } = await this.supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update document: ${error.message}`)
      }

      return document
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.issues.map((e: any) => e.message).join(', ')}`)
      }
      throw error
    }
  }

  /**
   * Delete a document and its associated journal
   */
  async deleteDocument(documentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (error) {
      throw new Error(`Failed to delete document: ${error.message}`)
    }
  }

  /**
   * Get a document by ID
   */
  async getDocument(documentId: string): Promise<Document | null> {
    const { data: document, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Document not found
      }
      throw new Error(`Failed to get document: ${error.message}`)
    }

    return document
  }

  /**
   * Get all documents by a writer
   */
  async getDocumentsByWriter(writerId: string): Promise<Document[]> {
    const { data: documents, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('writer_id', writerId)
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get documents: ${error.message}`)
    }

    return documents || []
  }

  /**
   * Get published documents for public viewing
   */
  async getPublishedDocuments(limit: number = 20): Promise<Document[]> {
    const { data: documents, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get published documents: ${error.message}`)
    }

    return documents || []
  }

  /**
   * Publish a document
   */
  async publishDocument(documentId: string): Promise<Document> {
    const updateData: DocumentUpdate = {
      published: true,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: document, error } = await this.supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to publish document: ${error.message}`)
    }

    return document
  }

  /**
   * Unpublish a document
   */
  async unpublishDocument(documentId: string): Promise<Document> {
    const updateData: DocumentUpdate = {
      published: false,
      published_at: undefined,
      updated_at: new Date().toISOString()
    }

    const { data: document, error } = await this.supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to unpublish document: ${error.message}`)
    }

    return document
  }

  /**
   * Duplicate a document
   */
  async duplicateDocument(documentId: string, newTitle?: string): Promise<Document> {
    // Get original document
    const original = await this.getDocument(documentId)
    if (!original) {
      throw new Error('Original document not found')
    }

    // Create duplicate
    const duplicateData: DocumentCreateInput = {
      title: newTitle || `${original.title} (Copy)`,
      content: original.content,
      published: false // Never publish duplicates automatically
    }

    return this.createDocument(original.writer_id, duplicateData)
  }

  /**
   * Auto-save document content
   * Optimized for frequent saves during editing
   */
  async autoSave(documentId: string, content: LexicalEditorState): Promise<void> {
    const { error } = await this.supabase
      .from('documents')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    if (error) {
      // Log error but don't throw to avoid disrupting user experience
      console.error('Auto-save failed:', error)
    }
  }
}

/**
 * Server Document Service Implementation
 * For use in API routes and Server Components
 */
export class ServerDocumentService implements DocumentService {
  private async getSupabase() {
    return await createSupabaseServerClient()
  }

  async createDocument(writerId: string, data: DocumentCreateInput): Promise<Document> {
    const validatedData = DocumentCreateSchema.parse(data)
    const supabase = await this.getSupabase()
    
    try {
      const documentData: DocumentInsert = {
        writer_id: writerId,
        title: validatedData.title,
        content: validatedData.content || null,
        published: validatedData.published || false
      }

      const { data: document, error } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create document: ${error.message}`)
      }

      return document
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.issues.map((e: any) => e.message).join(', ')}`)
      }
      throw error
    }
  }

  async updateDocument(documentId: string, data: DocumentUpdateInput): Promise<Document> {
    const validatedData = DocumentUpdateSchema.parse(data)
    const supabase = await this.getSupabase()
    
    try {
      const updateData: DocumentUpdate = {
        ...validatedData,
        updated_at: new Date().toISOString()
      }

      const { data: document, error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update document: ${error.message}`)
      }

      return document
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.issues.map((e: any) => e.message).join(', ')}`)
      }
      throw error
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (error) {
      throw new Error(`Failed to delete document: ${error.message}`)
    }
  }

  async getDocument(documentId: string): Promise<Document | null> {
    const supabase = await this.getSupabase()
    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to get document: ${error.message}`)
    }

    return document
  }

  async getDocumentsByWriter(writerId: string): Promise<Document[]> {
    const supabase = await this.getSupabase()
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('writer_id', writerId)
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get documents: ${error.message}`)
    }

    return documents || []
  }

  async getPublishedDocuments(limit: number = 20): Promise<Document[]> {
    const supabase = await this.getSupabase()
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get published documents: ${error.message}`)
    }

    return documents || []
  }

  async publishDocument(documentId: string): Promise<Document> {
    const supabase = await this.getSupabase()
    const updateData: DocumentUpdate = {
      published: true,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: document, error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to publish document: ${error.message}`)
    }

    return document
  }

  async unpublishDocument(documentId: string): Promise<Document> {
    const supabase = await this.getSupabase()
    const updateData: DocumentUpdate = {
      published: false,
      published_at: undefined,
      updated_at: new Date().toISOString()
    }

    const { data: document, error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to unpublish document: ${error.message}`)
    }

    return document
  }

  async duplicateDocument(documentId: string, newTitle?: string): Promise<Document> {
    const original = await this.getDocument(documentId)
    if (!original) {
      throw new Error('Original document not found')
    }

    const duplicateData: DocumentCreateInput = {
      title: newTitle || `${original.title} (Copy)`,
      content: original.content,
      published: false
    }

    return this.createDocument(original.writer_id, duplicateData)
  }

  async autoSave(documentId: string, content: LexicalEditorState): Promise<void> {
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .from('documents')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    if (error) {
      console.error('Auto-save failed:', error)
    }
  }
}

/**
 * Factory function to create appropriate document service
 * Automatically determines client vs server context
 */
export function createDocumentService(): DocumentService {
  if (typeof window !== 'undefined') {
    return new BrowserDocumentService()
  } else {
    return new ServerDocumentService()
  }
}