import { createSupabaseServerClient } from '@/lib/supabase/client-simple'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  
  await supabase.auth.signOut()
  
  redirect('/')
}