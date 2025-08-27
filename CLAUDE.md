# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mindmark is an AI-native writing platform that creates immutable process journals alongside written work, making creative thinking legible and verifiable in an AI-dominated future. The platform captures the writing process - prompts, decisions, revisions - in cryptographically-signed, timestamped journals that can be made public while protecting private content.

## Development Commands

```bash
# Development
npm run dev --host          # Start development server (always use --host flag)
npm run build               # Build for production
npm run start               # Start production server
npm run type-check          # TypeScript validation  
npm run lint                # ESLint validation
npm run test                # Run test suite with Vitest
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Generate test coverage report

# Turbopack (for faster development)
npm run dev --host --turbo  # Use Turbopack for much faster local development
npm run build --turbo       # Use Turbopack for builds (beta)

# Database (Supabase)
npx supabase start          # Start local Supabase
npx supabase db push        # Apply schema changes
npx supabase gen types typescript --local # Generate TypeScript types from DB schema
```

### Important Notes
- Always run with: `npm run dev --host`
- Tailscale address is: http://100.126.153.59:3000/
- Use `--turbo` flag for faster development with Turbopack (stable for dev, beta for build)

## Architecture

### Service Layer Pattern

The codebase follows Domain-Driven Design with a consistent service layer pattern:

```typescript
// Service Interface (in lib/services/[domain].ts)
interface Service {
  // Core CRUD operations
  create(...): Promise<Entity>
  update(...): Promise<Entity> 
  delete(...): Promise<void>
  get(...): Promise<Entity | null>
  
  // Domain-specific operations
  domainOperation(...): Promise<Result>
}

// Dual Implementation Pattern
class BrowserService implements Service {
  private supabase = createSupabaseBrowserClient()
  // Client-side implementation
}

class ServerService implements Service {
  private async getSupabase() {
    return await createSupabaseServerClient()
  }
  // Server-side implementation (RSC compatible)
}

// Factory Function
export function createService(): Service {
  return typeof window !== 'undefined' 
    ? new BrowserService() 
    : new ServerService()
}
```

### Key Services

- **AuthService** (`lib/services/auth.ts`): Authentication and writer profiles
- **DocumentService** (`lib/services/document.ts`): Document CRUD, auto-save, publishing
- **JournalService** (`lib/services/journal.ts`): Process capture, hash chains, privacy levels
- **VerificationService** (`lib/services/verification.ts`): Merkle trees, certificates
- **AIService** (`lib/services/ai.ts`): AI provider abstraction (OpenAI/Anthropic)

### Frontend Stack
- **Next.js 15** with App Router and React Server Components
- **React 19** with TypeScript 5.3
- **Lexical** (Meta's editor framework) for rich text editing
- **Zustand + React Query** for state management
- **Tailwind CSS + Radix UI + cmdk** for UI components
- **AI SDK** (@ai-sdk/openai + @ai-sdk/anthropic) for streaming AI interactions

### Backend & Infrastructure
- **Supabase** as unified backend (PostgreSQL + pgvector + Auth + Storage + Realtime)
- **Vercel Edge Runtime** for hosting
- **Arweave** for permanent blockchain storage
- **Twitter API** for free checkpointing
- **OpenAI gpt-5-mini** for summaries, **Anthropic Claude 4 Sonnet** for writing

### Database Schema

Core tables with domain relationships:

- **writers**: User profiles with public keys and settings
- **documents**: Lexical editor state, writer_id foreign key
- **writing_journals**: Process journals with privacy levels, document_id foreign key
- **journal_entries**: Append-only log with hash chains, journal_id foreign key
- **verification_checkpoints**: Merkle tree snapshots
- **publication_certificates**: Exportable verification documents

Row Level Security (RLS) policies ensure users only access their own private data.

## Testing

Tests use Vitest with coverage reporting:

```bash
npm run test                # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Generate coverage report
npm run test -- journal     # Run specific test file pattern
```

Test files are located alongside source files as `*.test.ts`.

## Hash Chain Implementation

The platform uses SHA-256 hash chains for immutability:

```typescript
// lib/services/journal.ts - HashChain class
HashChain.hash(content)           // Generate SHA-256 hash
HashChain.createEntry(content, prevHash)  // Create chained entry
HashChain.validateChain(entries)  // Verify chain integrity
```

Each journal entry includes:
- `content_hash`: SHA-256 of entry content
- `prev_hash`: Previous entry's hash
- `sequence`: Monotonic counter

## Component Structure

Components follow modular design:

```
components/
├── auth/             # Authentication forms
├── editor/           # Lexical editor components
│   ├── LexicalEditor.tsx
│   ├── AICommandPalette.tsx
│   └── EditorPlugins.tsx
├── journal/          # Journal viewing/management
│   ├── JournalViewer.tsx
│   ├── JournalTimeline.tsx
│   └── ProcessInsights.tsx
└── verification/     # Cryptographic proofs
    ├── CertificateGenerator.tsx
    └── HashChainValidator.tsx
```

## Error Handling

- Use Zod for input validation in services
- Services throw descriptive errors
- Components use ErrorBoundary for graceful failures
- Toast notifications for user feedback

## Environment Configuration

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Public anonymous key
SUPABASE_SERVICE_ROLE_KEY=       # Server-side service key

# Optional AI providers
OPENAI_API_KEY=                  # OpenAI GPT-5-mini
ANTHROPIC_API_KEY=               # Claude 4 Sonnet
```

## Key Implementation Patterns

### 1. Server Components vs Client Components
- Pages use Server Components for initial data fetching
- Interactive components use "use client" directive
- Services have dual implementations for both environments

### 2. Data Fetching
- Server Components fetch directly via ServerService
- Client Components use BrowserService with React hooks
- Real-time updates via Supabase subscriptions

### 3. Type Safety
- Database types generated from Supabase schema
- Zod schemas for runtime validation
- Strict TypeScript configuration

### 4. Privacy Levels
- **private**: Full journal only visible to author
- **summary**: AI-generated summary public
- **public**: Full journal publicly visible

## Current Implementation Status

✅ **Completed**:
- Project structure and configuration
- Database schema with migrations
- Service layer architecture
- Authentication system
- Document and Journal services
- Hash chain verification
- UI component structure
- Testing infrastructure

🚧 **In Progress**:
- Lexical editor integration
- AI command palette
- Real-time collaboration

📋 **Planned**:
- Merkle tree checkpointing
- Blockchain witnessing
- Certificate generation
- Voice annotations
- IMPORTANT: Do not change any model names, versions, or configuration values unless explicitly requested!
- You can use Playwright MCP for testing, but before using it it needs to be added with: claude mcp add playwright npx @playwright/mcp@latest