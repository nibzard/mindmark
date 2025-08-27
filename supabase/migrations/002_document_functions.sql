-- Add helper functions for document operations
-- This migration adds stored procedures to improve document/journal operations

-- Function to create document with journal atomically
CREATE OR REPLACE FUNCTION create_document_with_journal(
  p_writer_id UUID,
  p_title TEXT,
  p_content JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content JSONB,
  published BOOLEAN,
  published_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  journal_id UUID,
  journal_entry_count INT,
  journal_privacy_level TEXT
) AS $$
DECLARE
  v_journal_id UUID;
  v_document_id UUID;
BEGIN
  -- Create journal first
  INSERT INTO writing_journals (writer_id, privacy_level)
  VALUES (p_writer_id, 'private')
  RETURNING writing_journals.id INTO v_journal_id;
  
  -- Create document with journal reference
  INSERT INTO documents (writer_id, title, content, writing_journal_id, metadata)
  VALUES (p_writer_id, p_title, p_content, v_journal_id, p_metadata)
  RETURNING documents.id INTO v_document_id;
  
  -- Return the created document with journal info
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.content,
    d.published,
    d.published_at,
    d.metadata,
    d.created_at,
    d.updated_at,
    wj.id as journal_id,
    wj.entry_count as journal_entry_count,
    wj.privacy_level as journal_privacy_level
  FROM documents d
  JOIN writing_journals wj ON d.writing_journal_id = wj.id
  WHERE d.id = v_document_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get document with journal stats
CREATE OR REPLACE FUNCTION get_document_with_stats(p_document_id UUID, p_writer_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content JSONB,
  published BOOLEAN,
  published_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  journal_id UUID,
  journal_entry_count INT,
  journal_privacy_level TEXT,
  last_entry_at TIMESTAMPTZ,
  word_count INT,
  ai_interactions INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.content,
    d.published,
    d.published_at,
    d.metadata,
    d.created_at,
    d.updated_at,
    wj.id as journal_id,
    wj.entry_count as journal_entry_count,
    wj.privacy_level as journal_privacy_level,
    (SELECT MAX(je.created_at) FROM journal_entries je WHERE je.journal_id = wj.id) as last_entry_at,
    -- Estimate word count from content
    CASE 
      WHEN d.content IS NOT NULL 
      THEN array_length(string_to_array(trim(d.content::text), ' '), 1)
      ELSE 0 
    END as word_count,
    -- Count AI interactions (prompt/response pairs)
    (SELECT COUNT(*) FROM journal_entries je 
     WHERE je.journal_id = wj.id 
     AND je.entry_type IN ('prompt', 'response')) as ai_interactions
  FROM documents d
  JOIN writing_journals wj ON d.writing_journal_id = wj.id
  WHERE d.id = p_document_id AND d.writer_id = p_writer_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update document updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_document_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update document timestamp
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_document_timestamp();

-- Function to update journal updated_at timestamp automatically  
CREATE OR REPLACE FUNCTION update_journal_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update journal timestamp
DROP TRIGGER IF EXISTS update_journals_updated_at ON writing_journals;
CREATE TRIGGER update_journals_updated_at
  BEFORE UPDATE ON writing_journals
  FOR EACH ROW
  EXECUTE FUNCTION update_journal_timestamp();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_published ON documents(published, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_title_search ON documents USING gin(to_tsvector('english', title));

-- Add function to search documents by title
CREATE OR REPLACE FUNCTION search_documents(
  p_writer_id UUID,
  p_search_term TEXT,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content JSONB,
  published BOOLEAN,
  published_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  journal_entry_count INT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.content,
    d.published,
    d.published_at,
    d.metadata,
    d.created_at,
    d.updated_at,
    wj.entry_count as journal_entry_count,
    ts_rank(to_tsvector('english', d.title), plainto_tsquery('english', p_search_term)) as relevance
  FROM documents d
  JOIN writing_journals wj ON d.writing_journal_id = wj.id
  WHERE d.writer_id = p_writer_id
    AND to_tsvector('english', d.title) @@ plainto_tsquery('english', p_search_term)
  ORDER BY relevance DESC, d.updated_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;