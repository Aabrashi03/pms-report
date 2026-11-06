import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeAuthDestination } from '@/lib/auth-redirect';
export async function GET(request:NextRequest){
  const code=request.nextUrl.searchParams.get('code');
  const destination=safeAuthDestination(request.nextUrl.searchParams.get('next'));
  if(code){
    try {
      const auth=await createClient();
      const {data,error}=await auth.auth.exchangeCodeForSession(code);
      const email=data.user?.email?.trim().toLowerCase()||'';
      if(!error&&email.endsWith('@selangorproperties.com.my')){const response=NextResponse.redirect(new URL(destination,request.url));response.headers.set('Cache-Control','no-store');return response;}
      if(data.session)await auth.auth.signOut();
      return NextResponse.redirect(new URL('/login?error=company-account',request.url));
    }
    catch { /* Do not expose authentication details in a redirect. */ }
  }
  return NextResponse.redirect(new URL('/login?error=link',request.url));
}
