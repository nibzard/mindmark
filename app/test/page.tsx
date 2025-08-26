// ABOUTME: Test page to verify Supabase database connection and schema
// ABOUTME: Displays table information and tests basic connectivity

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function testConnection() {
  try {
    // Test basic connection by trying to query writers table
    const { data, error } = await supabase
      .from('writers')
      .select('count')
      .limit(1)

    if (error) {
      console.error('Database error:', error)
      return { connected: false, error: error.message }
    }
    
    return { connected: true, error: null }
  } catch (error) {
    console.error('Database connection error:', error)
    return { connected: false, error: 'Connection failed' }
  }
}

export default async function TestPage() {
  const result = await testConnection()

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Database Connection Test</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
        {result.connected ? (
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            ✅ Successfully connected to Supabase database
          </div>
        ) : (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            ❌ Failed to connect to database: {result.error}
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Expected Tables</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {['writers', 'documents', 'writing_journals', 'journal_entries', 'verification_checkpoints', 'publication_certificates', 'collaborators'].map((table) => (
            <div 
              key={table}
              className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-900"
            >
              {table}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}