# Mindmark Setup Guide

This guide will help you set up the Mindmark AI-native writing platform for development.

## Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier is sufficient)
- Optional: OpenAI and/or Anthropic API keys for AI features

## 1. Project Setup

### Clone and Install Dependencies

```bash
git clone <repository-url>
cd mindmark
npm install
```

### Environment Configuration

1. Copy the environment template:
```bash
cp .env.example .env.local
```

2. Configure your environment variables (see sections below).

## 2. Supabase Setup

### Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click "New Project"
3. Choose your organization and set:
   - **Project Name**: `mindmark` (or your preferred name)
   - **Database Password**: Generate a secure password
   - **Region**: Choose closest to your location
4. Wait for the project to be created (~2 minutes)

### Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings > API**
2. Copy the following values:
   - **Project URL**: This will be your `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API Key (anon/public)**: This will be your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Go to **Settings > API > Service Role Keys**
   - Copy the **service_role** key: This will be your `SUPABASE_SERVICE_ROLE_KEY`

### Update Environment Variables

Update your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Install Supabase CLI (Recommended)

1. Install the Supabase CLI:
```bash
npm install -g supabase
```

2. Initialize Supabase in your project:
```bash
supabase init
```

3. Link to your remote project:
```bash
supabase link --project-ref your-project-ref
```

### Apply Database Migrations

Choose **Option A** (CLI) or **Option B** (Dashboard):

#### Option A: Using Supabase CLI (Recommended)

```bash
# Apply the migration
supabase db push

# Generate TypeScript types
supabase gen types typescript --local > lib/types/supabase.ts
```

#### Option B: Using Supabase Dashboard

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and run the SQL in the editor
5. Verify all tables were created in **Database > Tables**

### Enable Required Extensions

The migration should automatically enable these, but verify in **Database > Extensions**:
- ✅ `uuid-ossp` - UUID generation
- ✅ `vector` - pgvector for semantic search

If not enabled, run:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
```

### Verify Database Setup

Check that these tables exist in **Database > Tables**:
- `writers` - User profiles
- `documents` - Creative works  
- `writing_journals` - Process capture
- `journal_entries` - Individual events
- `verification_checkpoints` - Cryptographic proofs
- `publication_certificates` - Verification artifacts
- `collaborators` - Multi-author support

## 3. AI Provider Setup (Optional)

### OpenAI Configuration

1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Add to `.env.local`:
```env
OPENAI_API_KEY=sk-your-openai-api-key
```

### Anthropic Configuration

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Add to `.env.local`:
```env
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
```

### Test AI Integration

1. Start the development server:
```bash
npm run dev
```

2. Navigate to `http://localhost:3000`
3. Register a new account
4. Try the AI command palette (if API keys are configured)

## 4. Development Workflow

### Start Development Server

```bash
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript validation

### Database Development

#### Local Development with Supabase CLI

```bash
# Start local Supabase stack
supabase start

# Reset local database
supabase db reset

# Generate types after schema changes
supabase gen types typescript --local > lib/types/supabase.ts

# Stop local stack
supabase stop
```

#### Creating Migrations

```bash
# Create a new migration
supabase migration new your-migration-name

# Apply migrations
supabase db push
```

## 5. Verification & Testing

### Check TypeScript Compilation

```bash
npm run type-check
```
Should complete without errors.

### Test Authentication Flow

1. Go to `http://localhost:3000`
2. Click "Sign Up" to create an account
3. Verify email if required
4. Complete profile setup
5. Access the dashboard

### Test Database Connection

1. Go to dashboard
2. Try creating a new document
3. Verify data appears in Supabase dashboard

### Test AI Features (if configured)

1. Open a document editor
2. Use Command+K (or Ctrl+K) to open AI palette
3. Try a simple prompt like "Help me write"
4. Verify response is captured in journal

## 6. Production Deployment

### Environment Variables for Production

Add these to your production environment (Vercel, Netlify, etc.):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key  
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

## 7. Troubleshooting

### Common Issues

#### TypeScript Errors
```bash
npm run type-check
```
- Ensure all dependencies are installed
- Check for missing imports or type definitions

#### Database Connection Failed
- Verify Supabase credentials in `.env.local`
- Check if project is paused (free tier auto-pauses after inactivity)
- Ensure RLS policies are properly configured

#### Migration Errors
- Check if pgvector extension is available in your Supabase project
- Verify you have the latest Supabase CLI version
- Try applying migrations manually via SQL editor

#### AI Features Not Working
- Verify API keys are correctly set
- Check API key permissions and billing
- Monitor network requests in browser developer tools

### Reset Database

If you need to start fresh:

```bash
# Using CLI
supabase db reset

# Or manually drop/recreate tables in Supabase dashboard
```

### Debug Mode

Enable debug logging by adding to `.env.local`:
```env
DEBUG=true
NODE_ENV=development
```

## 8. Next Steps

After setup is complete:

1. ✅ Verify all features work locally
2. 📚 Read the [TODO.md](./TODO.md) for implementation roadmap
3. 🔧 Start implementing missing features
4. 🧪 Add tests for critical functionality
5. 🚀 Deploy to production

## Support

- **Documentation**: Check [docs/](./docs/) folder
- **Issues**: Use GitHub issues for bug reports
- **Architecture**: See [VERDENT.md](./VERDENT.md) for technical details

---

*Last updated: [Current Date]*
*Setup should take approximately 15-20 minutes*