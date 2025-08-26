# AGENT.md

Development commands for Mindmark AI-native writing platform.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run type-check   # TypeScript validation
npm run lint         # ESLint validation
npx supabase start   # Local Supabase development
```

## Code Style

- **Imports**: Use `@/` aliases, type-only imports with `type` keyword, group external then internal
- **Naming**: kebab-case files, PascalCase components/types, camelCase functions/variables
- **Types**: Always use TypeScript, define interfaces before implementations
- **Components**: Use `'use client'` directive for client components, JSDoc for complex functions
- **Error handling**: Try-catch blocks with meaningful messages, never silent failures
- **Patterns**: Service factory pattern, custom hooks with clear return types, async/await over promises

This is a Next.js 15 + React 19 + TypeScript project with Lexical editor, Supabase backend, and AI SDK integration.
