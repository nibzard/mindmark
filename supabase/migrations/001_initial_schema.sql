-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Writers table (profiles) - User management following writing domain concepts
CREATE TABLE public.writers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  public_key TEXT,  -- For cryptographic signature verification
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table - Creative works
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  writer_id UUID REFERENCES writers(id) ON DELETE CASCADE,
  title TEXT,
  content JSONB,  -- Lexical editor state
  writing_journal_id UUID,  -- Reference to associated journal
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Writing Journals table - Process capture with vector embeddings
CREATE TABLE public.writing_journals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  writer_id UUID REFERENCES writers(id) ON DELETE CASCADE,
  entry_count INT DEFAULT 0,
  last_checkpoint_hash TEXT,
  last_checkpoint_at TIMESTAMPTZ,
  privacy_level TEXT DEFAULT 'private' CHECK (privacy_level IN ('private', 'summary', 'public')),
  summary TEXT,  -- AI-generated privacy-preserving summary
  summary_embedding vector(1536),  -- For semantic search using OpenAI embeddings
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal Entries table - Individual process events (append-only)
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_id UUID REFERENCES writing_journals(id) ON DELETE CASCADE,
  sequence INT NOT NULL,  -- Auto-incremented sequence number within journal
  entry_type TEXT NOT NULL CHECK (entry_type IN ('prompt', 'response', 'decision', 'annotation', 'revision', 'voice')),
  content TEXT,  -- Content may be encrypted for private entries
  content_hash TEXT NOT NULL,  -- SHA-256 hash for hash chain verification
  prev_hash TEXT NOT NULL,  -- Previous entry hash for chain integrity
  embedding vector(1536),  -- For semantic similarity search
  metadata JSONB DEFAULT '{}',  -- Includes timestamp, duration, AI model, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(journal_id, sequence)
);

-- Verification Checkpoints table - Cryptographic proofs
CREATE TABLE public.verification_checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_id UUID REFERENCES writing_journals(id) ON DELETE CASCADE,
  merkle_root TEXT NOT NULL,  -- Merkle tree root hash
  entry_range INT[],  -- [start_sequence, end_sequence] for this checkpoint
  witness_type TEXT CHECK (witness_type IN ('arweave', 'twitter', 'local')),
  witness_proof TEXT,  -- Transaction ID (Arweave) or Tweet ID (Twitter)
  witness_data JSONB,  -- Additional witness metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Publication Certificates table - Verification artifacts
CREATE TABLE public.publication_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  journal_id UUID REFERENCES writing_journals(id) ON DELETE CASCADE,
  certificate_data JSONB NOT NULL,  -- Full certificate JSON-LD format
  merkle_root TEXT NOT NULL,  -- Associated Merkle root for verification
  signature TEXT,  -- Writer's cryptographic signature
  public_url TEXT UNIQUE,  -- Shareable verification link
  verification_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collaboration table (for future multi-author support)
CREATE TABLE public.collaborators (
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  writer_id UUID REFERENCES writers(id) ON DELETE CASCADE,
  permission TEXT CHECK (permission IN ('read', 'write', 'admin')),
  added_by UUID REFERENCES writers(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (document_id, writer_id)
);

-- Create foreign key constraint after all tables exist
ALTER TABLE documents ADD CONSTRAINT fk_writing_journal 
  FOREIGN KEY (writing_journal_id) REFERENCES writing_journals(id);

-- Performance indexes for vector similarity search
CREATE INDEX idx_journals_writer ON writing_journals(writer_id);
CREATE INDEX idx_entries_journal ON journal_entries(journal_id);
CREATE INDEX idx_entries_sequence ON journal_entries(journal_id, sequence);
CREATE INDEX idx_documents_writer ON documents(writer_id);
CREATE INDEX idx_checkpoints_journal ON verification_checkpoints(journal_id);

-- Vector similarity indexes using IVFFLAT for pgvector
CREATE INDEX idx_journals_summary_embedding ON writing_journals 
  USING ivfflat (summary_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_entries_embedding ON journal_entries 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable Row Level Security for all tables
ALTER TABLE writers ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies following domain-driven design principles

-- Writers can view and update their own profiles
CREATE POLICY "writers_select_own" ON writers FOR SELECT 
  USING (auth.uid() = id);
CREATE POLICY "writers_update_own" ON writers FOR UPDATE 
  USING (auth.uid() = id);
CREATE POLICY "writers_insert_own" ON writers FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Documents visibility based on publication status and ownership
CREATE POLICY "documents_select" ON documents FOR SELECT 
  USING (auth.uid() = writer_id OR published = true);
CREATE POLICY "documents_insert_own" ON documents FOR INSERT 
  WITH CHECK (auth.uid() = writer_id);
CREATE POLICY "documents_update_own" ON documents FOR UPDATE 
  USING (auth.uid() = writer_id);
CREATE POLICY "documents_delete_own" ON documents FOR DELETE 
  USING (auth.uid() = writer_id);

-- Journal visibility respects privacy levels
CREATE POLICY "journals_select" ON writing_journals FOR SELECT
  USING (auth.uid() = writer_id OR privacy_level IN ('summary', 'public'));
CREATE POLICY "journals_insert_own" ON writing_journals FOR INSERT
  WITH CHECK (auth.uid() = writer_id);
CREATE POLICY "journals_update_own" ON writing_journals FOR UPDATE
  USING (auth.uid() = writer_id);

-- Journal entries follow journal privacy rules
CREATE POLICY "entries_select" ON journal_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM writing_journals
    WHERE writing_journals.id = journal_entries.journal_id
    AND (writing_journals.writer_id = auth.uid() OR writing_journals.privacy_level = 'public')
  ));
CREATE POLICY "entries_insert_own" ON journal_entries FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM writing_journals
    WHERE writing_journals.id = journal_entries.journal_id
    AND writing_journals.writer_id = auth.uid()
  ));

-- Checkpoints follow journal privacy
CREATE POLICY "checkpoints_select" ON verification_checkpoints FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM writing_journals
    WHERE writing_journals.id = verification_checkpoints.journal_id
    AND (writing_journals.writer_id = auth.uid() OR writing_journals.privacy_level IN ('summary', 'public'))
  ));
CREATE POLICY "checkpoints_insert_own" ON verification_checkpoints FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM writing_journals
    WHERE writing_journals.id = verification_checkpoints.journal_id
    AND writing_journals.writer_id = auth.uid()
  ));

-- Certificates are publicly viewable when published
CREATE POLICY "certificates_select_public" ON publication_certificates FOR SELECT
  USING (true);  -- All certificates are publicly viewable for verification
CREATE POLICY "certificates_insert_own" ON publication_certificates FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = publication_certificates.document_id
    AND documents.writer_id = auth.uid()
  ));

-- Collaborators can view their permissions
CREATE POLICY "collaborators_select" ON collaborators FOR SELECT
  USING (auth.uid() = writer_id OR EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = collaborators.document_id
    AND documents.writer_id = auth.uid()
  ));

-- Database functions for automatic sequence numbering
CREATE OR REPLACE FUNCTION increment_journal_sequence()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-increment sequence number within journal
  NEW.sequence = COALESCE(
    (SELECT MAX(sequence) FROM journal_entries WHERE journal_id = NEW.journal_id),
    0
  ) + 1;
  
  -- Update journal entry count
  UPDATE writing_journals 
  SET entry_count = NEW.sequence, updated_at = NOW()
  WHERE id = NEW.journal_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic sequence numbering
CREATE TRIGGER set_journal_sequence
  BEFORE INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION increment_journal_sequence();

-- Function for hash chain validation
CREATE OR REPLACE FUNCTION validate_hash_chain(journal_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  entry_record RECORD;
  expected_hash TEXT;
  prev_hash TEXT := '';
BEGIN
  -- Iterate through entries in sequence order
  FOR entry_record IN 
    SELECT content_hash, prev_hash FROM journal_entries 
    WHERE journal_id = journal_uuid 
    ORDER BY sequence
  LOOP
    -- Check if previous hash matches
    IF entry_record.prev_hash != prev_hash THEN
      RETURN FALSE;
    END IF;
    prev_hash := entry_record.content_hash;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function for semantic similarity search
CREATE OR REPLACE FUNCTION search_journal_entries(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  journal_id UUID,
  entry_id UUID,
  content TEXT,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    je.journal_id,
    je.id as entry_id,
    je.content,
    1 - (je.embedding <=> query_embedding) as similarity
  FROM journal_entries je
  JOIN writing_journals wj ON je.journal_id = wj.id
  WHERE 
    wj.privacy_level = 'public'
    AND 1 - (je.embedding <=> query_embedding) > match_threshold
  ORDER BY je.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;