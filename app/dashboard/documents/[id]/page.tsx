/**
 * Document Editor Page
 * Full-featured document editing with AI integration and process journaling
 */

import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { redirect, notFound } from 'next/navigation'
import { DocumentEditor } from '@/components/documents/DocumentEditor'

interface DocumentPageProps {
  params: { id: string }
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const supabase = await createSupabaseServerClient()
  
  // Check authentication
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth/login')
  }

  // Fetch document with journal information
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select(`
      id,
      title,
      content,
      published,
      published_at,
      metadata,
      created_at,
      updated_at,
      writing_journals (
        id,
        entry_count,
        privacy_level,
        summary,
        last_checkpoint_at
      )
    `)
    .eq('id', params.id)
    .eq('writer_id', user.id)
    .single()

  if (docError) {
    if (docError.code === 'PGRST116') {
      notFound()
    }
    throw new Error('Failed to load document')
  }

  // Get writer profile
  const { data: writer } = await supabase
    .from('writers')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Document Editor */}
      <DocumentEditor 
        document={document}
        writer={writer}
      />
    </div>
  )
}

// Generate metadata for the page
export async function generateMetadata({ params }: DocumentPageProps) {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return {
      title: 'Document Not Found - Mindmark'
    }
  }

  const { data: document } = await supabase
    .from('documents')
    .select('title')
    .eq('id', params.id)
    .eq('writer_id', user.id)
    .single()

  return {
    title: document ? `${document.title} - Mindmark` : 'Document Not Found - Mindmark'
  }
}