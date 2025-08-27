-- Add performance indexes and constraints
-- Migration: 002_add_indexes

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_journal_entries_journal_id_sequence 
ON journal_entries(journal_id, sequence);

CREATE INDEX IF NOT EXISTS idx_journal_entries_content_hash 
ON journal_entries(content_hash);

CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at 
ON journal_entries(created_at);

CREATE INDEX IF NOT EXISTS idx_writing_journals_writer_id 
ON writing_journals(writer_id);

CREATE INDEX IF NOT EXISTS idx_writing_journals_document_id 
ON writing_journals(document_id);

CREATE INDEX IF NOT EXISTS idx_documents_writer_id_updated_at 
ON documents(writer_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_verification_checkpoints_journal_id 
ON verification_checkpoints(journal_id);

CREATE INDEX IF NOT EXISTS idx_verification_checkpoints_merkle_root 
ON verification_checkpoints(merkle_root);

CREATE INDEX IF NOT EXISTS idx_publication_certificates_document_id 
ON publication_certificates(document_id);

CREATE INDEX IF NOT EXISTS idx_publication_certificates_journal_id 
ON publication_certificates(journal_id);

-- Add vector similarity search index if not exists
CREATE INDEX IF NOT EXISTS idx_writing_journals_content_vector 
ON writing_journals USING ivfflat (content_vector vector_cosine_ops)
WITH (lists = 100);

-- Add constraints for data integrity
ALTER TABLE journal_entries 
ADD CONSTRAINT check_sequence_positive 
CHECK (sequence > 0);

ALTER TABLE verification_checkpoints 
ADD CONSTRAINT check_entry_range_valid 
CHECK (entry_range[1] <= entry_range[2] AND entry_range[1] > 0);

-- Add partial indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_published 
ON documents(writer_id, updated_at DESC) 
WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_journal_entries_ai_interactions 
ON journal_entries(journal_id, created_at) 
WHERE entry_type IN ('prompt', 'response');

-- Add GIN index for JSON metadata search
CREATE INDEX IF NOT EXISTS idx_journal_entries_metadata 
ON journal_entries USING GIN (metadata);

-- Add index for hash chain validation
CREATE INDEX IF NOT EXISTS idx_journal_entries_hash_chain 
ON journal_entries(journal_id, sequence, prev_hash, content_hash);

-- Comments for documentation
COMMENT ON INDEX idx_journal_entries_journal_id_sequence IS 
'Optimizes sequential journal entry retrieval';

COMMENT ON INDEX idx_journal_entries_content_hash IS 
'Enables fast content hash lookups for verification';

COMMENT ON INDEX idx_writing_journals_content_vector IS 
'Supports semantic similarity search using pgvector';

COMMENT ON INDEX idx_journal_entries_hash_chain IS 
'Optimizes hash chain validation queries';
