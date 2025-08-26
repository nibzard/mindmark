# Mindmark Tech Stack
## Unified Architecture with Supabase at the Core

### Frontend

```json
{
  "framework": "Next.js 15 (App Router + RSC)",
  "runtime": "React 19 + TypeScript 5.3",
  "editor": "Lexical (Meta's editor framework)",
  "state": "Zustand + React Query",
  "ui": "Tailwind CSS + Radix UI + cmdk",
  "ai_streaming": "@ai-sdk/openai + @ai-sdk/anthropic"
}
```

### Backend & Infrastructure

```yaml
hosting: "Vercel Edge Runtime"
database: "Supabase (PostgreSQL + pgvector + Auth + Storage + Realtime)"
blockchain: "Arweave (permanent storage)"
witness: "Twitter API (free checkpointing)"
ai_providers: "OpenAI gpt-5-mini for summaries, Anthropic Claude 4 Sonnet for writing"
```

### Core Dependencies

**Editor & Journal Capture:**
```bash
npm install lexical @lexical/react @lexical/markdown @lexical/code
npm install @lexical/rich-text @lexical/selection @lexical/history
npm install react-hotkeys-hook cmdk  # Command palette
npm install react-audio-visualizer  # Voice notes
```

**Database & Auth:**
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install drizzle-orm drizzle-kit postgres  # Type-safe queries
npm install @supabase/realtime-js  # For collaborative journals
```

**AI & Streaming:**
```bash
npm install ai openai @anthropic-ai/sdk
npm install eventsource-parser  # SSE parsing
npm install tiktoken  # Token counting
npm install zod  # Prompt validation
```

**Cryptography & Blockchain:**
```bash
npm install @noble/hashes  # SHA-256 for hash chains
npm install merkletreejs  # Merkle trees
npm install arweave  # Permanent storage
npm install tweetnacl tweetnacl-util  # Signatures
```

### Database Schema (Supabase)

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  public_key TEXT,  -- For signature verification
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  content JSONB,  -- Lexical editor state
  journal_id UUID REFERENCES journals(id),
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journals table with vector embeddings
CREATE TABLE journals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  entry_count INT DEFAULT 0,
  last_checkpoint_hash TEXT,
  last_checkpoint_at TIMESTAMPTZ,
  privacy_level TEXT DEFAULT 'private' CHECK (privacy_level IN ('private', 'summary', 'public')),
  summary TEXT,  -- AI-generated summary
  summary_embedding vector(1536),  -- For semantic search
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal entries (append-only)
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_id UUID REFERENCES journals(id) ON DELETE CASCADE,
  sequence INT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('prompt', 'response', 'decision', 'annotation', 'revision', 'voice')),
  content TEXT,  -- Encrypted if private
  content_hash TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  embedding vector(1536),  -- For semantic similarity
  metadata JSONB DEFAULT '{}',  -- Includes timestamp, duration, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(journal_id, sequence)
);

-- Checkpoints table
CREATE TABLE checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_id UUID REFERENCES journals(id) ON DELETE CASCADE,
  merkle_root TEXT NOT NULL,
  entry_range INT[],  -- [start_sequence, end_sequence]
  witness_type TEXT CHECK (witness_type IN ('arweave', 'twitter', 'local')),
  witness_proof TEXT,  -- Transaction ID or Tweet ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certificates table
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  journal_id UUID REFERENCES journals(id) ON DELETE CASCADE,
  certificate_data JSONB NOT NULL,  -- Full certificate JSON
  merkle_root TEXT NOT NULL,
  signature TEXT,  -- Author's signature
  public_url TEXT UNIQUE,  -- Shareable link
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collaboration table (for future)
CREATE TABLE collaborators (
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  permission TEXT CHECK (permission IN ('read', 'write', 'admin')),
  added_by UUID REFERENCES profiles(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (document_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_journals_user ON journals(user_id);
CREATE INDEX idx_entries_journal ON journal_entries(journal_id);
CREATE INDEX idx_entries_sequence ON journal_entries(journal_id, sequence);
CREATE INDEX idx_journals_embedding ON journals USING ivfflat (summary_embedding vector_cosine_ops);
CREATE INDEX idx_entries_embedding ON journal_entries USING ivfflat (embedding vector_cosine_ops);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data (with exceptions for public content)
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id OR published = true);
CREATE POLICY "Users can insert own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON documents FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view journals" ON journals FOR SELECT
  USING (auth.uid() = user_id OR privacy_level IN ('summary', 'public'));

CREATE POLICY "Users can view journal entries" ON journal_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM journals
    WHERE journals.id = journal_entries.journal_id
    AND (journals.user_id = auth.uid() OR journals.privacy_level = 'public')
  ));

-- Functions
CREATE OR REPLACE FUNCTION increment_journal_sequence()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sequence = COALESCE(
    (SELECT MAX(sequence) FROM journal_entries WHERE journal_id = NEW.journal_id),
    0
  ) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_journal_sequence
  BEFORE INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION increment_journal_sequence();
```

### Supabase Edge Functions

```typescript
// supabase/functions/generate-embeddings/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'
import { Configuration, OpenAIApi } from 'openai'

serve(async (req) => {
  const { content, type } = await req.json()

  // Generate embedding using OpenAI
  const openai = new OpenAIApi(new Configuration({
    apiKey: Deno.env.get('OPENAI_API_KEY'),
  }))

  const response = await openai.createEmbedding({
    model: 'text-embedding-3-small',
    input: content,
  })

  const embedding = response.data.data[0].embedding

  // Store in database
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  return new Response(JSON.stringify({ embedding }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

```typescript
// supabase/functions/checkpoint-journal/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { MerkleTree } from 'merkletreejs'
import Arweave from 'arweave'

serve(async (req) => {
  const { journalId } = await req.json()

  // Fetch journal entries
  const { data: entries } = await supabase
    .from('journal_entries')
    .select('content_hash')
    .eq('journal_id', journalId)
    .order('sequence')

  // Build merkle tree
  const leaves = entries.map(e => Buffer.from(e.content_hash))
  const tree = new MerkleTree(leaves, SHA256)
  const root = tree.getRoot().toString('hex')

  // Post to Arweave
  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
  })

  const transaction = await arweave.createTransaction({
    data: JSON.stringify({ journalId, root, timestamp: Date.now() })
  })

  await arweave.transactions.sign(transaction)
  await arweave.transactions.post(transaction)

  // Save checkpoint
  await supabase.from('checkpoints').insert({
    journal_id: journalId,
    merkle_root: root,
    witness_type: 'arweave',
    witness_proof: transaction.id,
  })

  return new Response(JSON.stringify({ root, txId: transaction.id }))
})
```

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# AI Providers
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Blockchain
ARWEAVE_KEY=xxx  # JWK key for Arweave

# Optional
TWITTER_API_KEY=xxx  # For Twitter checkpointing
```

### Key Integrations

**1. Semantic Journal Search with pgvector:**
```typescript
// Find similar thought patterns across journals
async function findSimilarEntries(query: string) {
  // Generate embedding for query
  const embedding = await openai.createEmbedding({
    model: 'text-embedding-3-small',
    input: query
  })

  // Search using pgvector
  const { data } = await supabase.rpc('search_journal_entries', {
    query_embedding: embedding,
    match_threshold: 0.78,
    match_count: 10
  })

  return data
}
```

**2. Real-time Journal Collaboration:**
```typescript
// Subscribe to journal updates
const channel = supabase.channel(`journal:${journalId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'journal_entries',
    filter: `journal_id=eq.${journalId}`
  }, (payload) => {
    // Update UI with new entry
    addEntryToUI(payload.new)
  })
  .subscribe()
```

**3. Automatic Summary Generation:**
```typescript
// Generate privacy-preserving summaries
async function generateJournalSummary(entries: JournalEntry[]) {
  const prompt = `
    Summarize this writing process journal without revealing specific content:
    - Focus on process, decisions, and evolution of thinking
    - Hide proprietary prompts and specific text
    - Highlight collaboration and revision patterns

    Entries: ${JSON.stringify(entries)}
  `

  const summary = await openai.complete(prompt)

  // Store summary and its embedding
  await supabase.from('journals').update({
    summary,
    summary_embedding: await generateEmbedding(summary)
  }).eq('id', journalId)
}
```

### Simplified Architecture Benefits

**Why Supabase is Perfect:**
1. **pgvector** - Semantic search through journals without Pinecone
2. **Auth** - Built-in, no Clerk needed
3. **Storage** - Journal exports, voice notes, without R2
4. **Realtime** - Collaborative journals without additional WebSocket server
5. **Edge Functions** - Checkpointing logic runs near data
6. **RLS** - Row-level security for privacy controls
7. **One vendor** - Simplified billing, monitoring, support

### Cost Estimation (Simplified)

**Per 1000 MAU:**
- Vercel: $20 (Pro plan)
- Supabase: $25 (Pro plan - includes auth, database, storage, vector)
- Arweave: ~$30 (permanent storage for checkpoints)
- OpenAI: ~$100 (embeddings + summaries)

**Total: ~$175/month** (down from $300)

### Development Phases (Updated)

**Phase 1 (MVP - 1 week)**
- Supabase setup with auth
- Basic Lexical editor
- Journal capture to database
- Local hash chain

**Phase 2 (Alpha - 2 weeks)**
- pgvector semantic search
- AI summaries
- Twitter checkpointing
- Public journal views

**Phase 3 (Beta - 3 weeks)**
- Arweave integration
- Certificate generation
- Realtime collaboration
- Voice annotations

**Phase 4 (Launch - 4 weeks)**
- Performance optimization
- Publisher dashboard
- API for integrations
- Marketing site

### Why This Stack Wins

1. **Simplicity** - One database for everything
2. **Speed** - Edge functions + pgvector = fast semantic search
3. **Cost** - 40% cheaper than distributed architecture
4. **Reliability** - Supabase handles scaling, backups, monitoring
5. **Developer Experience** - Great TypeScript support, RLS policies
6. **Future-proof** - Easy to add AI features with embeddings ready
