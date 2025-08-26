# Mindmark - AI-Native Writing Platform

## Project Overview

Mindmark is an AI-native writing platform with process verification that makes human thinking visible through immutable process journals, cryptographic verification, and transparency tools.

## Quick Start

### Prerequisites

- Node.js 18.18+ (current: 18.17.0 - some warnings expected)
- npm or yarn
- Supabase account
- OpenAI API key (optional for full functionality)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository>
   cd mindmark
   npm install
   ```

2. **Environment setup:**
   ```bash
   cp .env.example .env.local
   ```

3. **Configure environment variables in `.env.local`:**
   ```bash
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # AI Providers (optional)
   OPENAI_API_KEY=sk-your_openai_api_key
   ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key
   ```

4. **Database setup:**
   - Create a new Supabase project
   - Run the migration in `supabase/migrations/001_initial_schema.sql`
   - Enable Row Level Security
   - Configure authentication providers

5. **Start development:**
   ```bash
   npm run dev
   ```

## Architecture Overview

### Core Principles

1. **Modularity**: Every component is self-contained with clear interfaces
2. **Domain-Driven Design**: Code organization follows writing process concepts
3. **Extensive Documentation**: All code includes comprehensive documentation

### Project Structure

```
mindmark/
├── app/                    # Next.js App Router
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main application
│   └── layout.tsx         # Root layout
├── components/            # Composable UI components
│   ├── auth/             # Authentication components
│   ├── editor/           # Lexical editor components
│   ├── journal/          # Journal-specific components
│   └── verification/     # Verification UI components
├── lib/                  # Business logic
│   ├── services/         # Domain services (isolated)
│   │   ├── auth.ts       # Authentication service
│   │   ├── document.ts   # Document management
│   │   └── journal.ts    # Journal and hash chain
│   ├── supabase/         # Database client configuration
│   ├── types/            # TypeScript definitions
│   └── utils/            # Pure utility functions
├── supabase/             # Database schema and functions
│   ├── migrations/       # Database migrations
│   └── functions/        # Edge functions
└── docs/                 # Documentation and ADRs
```

### Key Services

#### AuthService
Handles user authentication and writer profile management:
- Sign up/sign in with email/password
- Writer profile creation and management
- Session management with Supabase auth

#### DocumentService
Manages document lifecycle and operations:
- Document CRUD operations
- Auto-save functionality
- Publishing workflow
- Document duplication

#### JournalService
Handles process capture and hash chain verification:
- Automatic journal creation
- Hash chain computation using SHA-256
- Journal entry management
- Privacy level controls

### Database Schema

The database follows domain-driven design with these core tables:

- **writers**: User profiles with cryptographic keys
- **documents**: Creative works with Lexical editor state
- **writing_journals**: Process capture with privacy controls
- **journal_entries**: Append-only log with hash chains
- **verification_checkpoints**: Merkle tree snapshots
- **publication_certificates**: Verifiable process proof

## Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run type-check   # TypeScript validation
npm run lint         # ESLint validation

# Database (when Supabase CLI is setup)
npx supabase start   # Start local Supabase
npx supabase db push # Apply schema changes
```

## Current Implementation Status

### ✅ Completed
- [x] Next.js 15 project setup with TypeScript
- [x] Tailwind CSS and ESLint configuration
- [x] Modular project structure
- [x] Supabase database schema with pgvector
- [x] Authentication system with user profiles
- [x] Document service with CRUD operations
- [x] Journal service with hash chain verification
- [x] Comprehensive TypeScript types

### 🚧 In Progress
- [ ] Lexical editor integration
- [ ] AI provider abstraction layer

### 📋 Planned
- [ ] Cryptographic verification services
- [ ] Privacy and publishing services
- [ ] Composable UI components
- [ ] Comprehensive testing suite

## Development Guidelines

### Domain-Driven Design

Code organization follows writing process concepts:

- **Writers**: Users of the platform
- **Documents**: Creative works being written
- **Journals**: Process capture logs
- **Entries**: Individual process events
- **Verification**: Cryptographic proofs

### Service Architecture

Each service follows a consistent pattern:

```typescript
interface Service {
  // Core operations
  create(...): Promise<Entity>
  update(...): Promise<Entity>
  delete(...): Promise<void>
  get(...): Promise<Entity | null>
  
  // Domain-specific operations
  domainSpecificMethod(...): Promise<Result>
}

// Browser implementation
class BrowserService implements Service {
  private supabase = createSupabaseBrowserClient()
  // Implementation for client-side
}

// Server implementation  
class ServerService implements Service {
  private async getSupabase() {
    return await createSupabaseServerClient()
  }
  // Implementation for server-side
}

// Factory function
export function createService(): Service {
  return typeof window !== 'undefined' 
    ? new BrowserService() 
    : new ServerService()
}
```

### Error Handling

- Use Zod for input validation
- Provide clear error messages
- Handle edge cases gracefully
- Log errors appropriately

### Testing Strategy

- Unit tests for service methods
- Integration tests for database operations
- End-to-end tests for user workflows
- Hash chain verification tests

## Configuration

### Environment Variables

Required variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY=       # Supabase service role key
```

Optional variables:
```bash
OPENAI_API_KEY=                  # For AI integration
ANTHROPIC_API_KEY=               # Alternative AI provider
ARWEAVE_KEY_FILE=               # For blockchain verification
TWITTER_API_KEY=                # For witness verification
```

### Database Configuration

The database uses PostgreSQL with pgvector extension:

1. Enable required extensions:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "vector";
   ```

2. Configure Row Level Security for all tables
3. Set up automatic sequence numbering for journal entries
4. Create vector indexes for semantic search

## Troubleshooting

### Common Issues

1. **Node.js Version Warnings**
   - Current environment uses Node 18.17.0
   - Some packages require 18.18.0+
   - Warnings are expected but don't affect functionality

2. **TypeScript Errors**
   - Run `npm run type-check` to validate
   - Ensure all imports use correct paths
   - Check that database types are properly generated

3. **Supabase Connection**
   - Verify environment variables are set
   - Check that database schema is applied
   - Ensure RLS policies are configured

### Development Tips

1. **Database Changes**
   - Always create migrations for schema changes
   - Test RLS policies thoroughly
   - Update TypeScript types after schema changes

2. **Service Development**
   - Implement browser version first
   - Add server version for SSR compatibility
   - Use factory pattern for service creation

3. **UI Components**
   - Follow modular design principles
   - Keep components focused and reusable
   - Document component props and usage

## Next Steps

1. **Lexical Editor Integration**
   - Install Lexical packages
   - Create editor components
   - Integrate with document service

2. **AI Provider Setup**
   - Create AI service abstraction
   - Implement OpenAI integration
   - Add streaming response handling

3. **Verification Services**
   - Implement Merkle tree generation
   - Add blockchain witness support
   - Create certificate generation

## Contributing

1. Follow the established service patterns
2. Add comprehensive documentation
3. Include tests for new functionality
4. Update TypeScript types as needed
5. Follow domain-driven design principles

## Support

For questions or issues:
1. Check this documentation
2. Review the code comments
3. Look at existing service implementations
4. Check the database schema comments