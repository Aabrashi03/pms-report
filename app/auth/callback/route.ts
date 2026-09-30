import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeAuthDestination } from '@/lib/auth-redirect';
export async function GET(request:NextRequest){
  const code=request.nextUrl.searchParams.get('code');
  const destination=safeAuthDestination(request.nextUrl.searchParams.get('next'));
  if(code){
    try {const {error}=await (await createClient()).auth.exchangeCodeForSession(code);if(!error){const response=NextResponse.redirect(new URL(destination,request.url));response.headers.set('Cache-Control','no-store');return response;}}
    catch { /* Do not expose authentication details in a redirect. */ }
  }
  return NextResponse.redirect(new URL('/login?error=link',request.url));
}
