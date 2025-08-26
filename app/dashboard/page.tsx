import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  
  // Get current user
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth/login')
  }
  
  // Get writer profile
  const { data: writer } = await supabase
    .from('writers')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Mindmark Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {writer?.display_name || writer?.username || user.email}
              </span>
              <form action="/auth/signout" method="post">
                <button 
                  type="submit"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to Mindmark
              </h2>
              <p className="text-gray-600 mb-8">
                Your AI-native writing platform with process verification is ready.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-2">Create Document</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Start a new writing project with automatic journal capture.
                  </p>
                  <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
                    New Document
                  </button>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-2">View Journals</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Explore your writing process history and insights.
                  </p>
                  <button className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
                    Browse Journals
                  </button>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-2">Generate Certificate</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Create verifiable proof of your writing process.
                  </p>
                  <button className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700">
                    Create Certificate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}