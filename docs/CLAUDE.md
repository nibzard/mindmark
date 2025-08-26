# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mindmark is an AI-native writing platform that creates immutable process journals alongside written work, making creative thinking legible and verifiable in an AI-dominated future. The platform captures the writing process - prompts, decisions, revisions - in cryptographically-signed, timestamped journals that can be made public while protecting private content.

## Architecture

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

### Key Data Structures
- **Documents**: Main content with Lexical editor state
- **Journals**: Process journals with privacy levels (private/summary/public)
- **Journal Entries**: Append-only log of prompts, responses, decisions, annotations
- **Checkpoints**: Merkle tree roots for immutability verification
- **Certificates**: Exportable JSON-LD proof documents

## Development Commands

Since this is an early-stage project without implementation yet:

```bash
# Setup (when implemented)
npm install
npm run dev          # Start development server
npm run build        # Build for production
npm run type-check   # TypeScript validation
npm run lint         # ESLint validation

# Database (Supabase)
npx supabase start   # Local development
npx supabase db push # Apply schema changes
npx supabase gen types typescript --local # Generate types
```

## Core Features to Implement

### 1. Process Journal System
- Automatic capture of every AI interaction with timestamps
- Inline annotations via `//` comments or voice notes
- Prompt evolution tracking showing thinking development
- Privacy levels: Full journal (private) → Summary (public) → Certificate (immutable)
- Cross-references via @mentions and source links

### 2. AI-Native Editor
- Command palette interface for AI interactions
- Version branching to explore multiple AI suggestions in parallel
- Contextual AI that understands full journal context
- Multi-model support (OpenAI GPT-5-mini, Claude 4 Sonnet)
- Smart diff view showing exactly what AI changed

### 3. Immutability Layer
- Hash chain where each entry includes previous hash
- Periodic checkpoints with Merkle roots posted every 10 entries
- Public witness via Twitter, Arweave, or Ethereum L2
- Selective disclosure to prove specific entries without revealing all
- Portable certificates as JSON-LD + cryptographic signatures

## Database Schema Notes

The database uses PostgreSQL with pgvector extension for semantic search:
- **profiles** extends Supabase auth with public keys and settings
- **documents** stores Lexical editor state and links to journals
- **journals** contains metadata, summaries, and vector embeddings
- **journal_entries** is append-only with content hashes and embeddings
- **checkpoints** stores Merkle roots with blockchain proof
- **certificates** contains exportable verification documents

Row Level Security (RLS) policies ensure users only see their own private data while allowing public/summary content to be shared.

## Key Principles

### User Experience
- **Transparency over detection**: Celebrate human thinking rather than catching AI use
- **Process has value**: The journey of thought is as meaningful as the final product
- **Privacy-preserving**: Can prove process without revealing proprietary prompts
- **Natural workflow**: Invisible capture that doesn't disrupt creative flow

### Technical Approach
- **Immutable append-only logs** for trust and verification
- **Semantic search** through journals using vector embeddings
- **Real-time collaboration** on shared journals
- **Cryptographic proofs** without revealing private content
- **Multi-modal capture** including voice annotations

## Development Phases

1. **MVP (1 week)**: Supabase setup, basic Lexical editor, journal capture, local hash chain
2. **Alpha (2 weeks)**: pgvector semantic search, AI summaries, Twitter checkpointing, public views
3. **Beta (3 weeks)**: Arweave integration, certificate generation, realtime collaboration, voice annotations
4. **Launch (4 weeks)**: Performance optimization, publisher dashboard, API integrations, marketing site

## Important Implementation Notes

- Use **pgvector** for semantic search rather than external vector databases
- Implement **hash chains** for local verification before blockchain checkpointing
- Support **selective disclosure** - prove specific entries without revealing full journal
- Generate **privacy-preserving summaries** that show process without revealing content
- Build **certificate embedding** system for published work verification
- Create **collaborative journal** features with attribution and co-signing

## Target Users

- **Primary**: Professional writers, journalists, researchers, content creators
- **Secondary**: Publishers, employers, educational institutions  
- **Tertiary**: Anyone needing to demonstrate authentic human involvement in creative work

The platform aims to make human thinking visible and valuable in an AI-dominated creative landscape.