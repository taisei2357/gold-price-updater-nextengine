import { NextRequest } from 'next/server'

/**
 * NextEngine OAuth認証開始
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
  
  const authUrl = new URL('https://base.next-engine.org/apps/oauth2/auth')
  authUrl.searchParams.set('client_id', process.env.NE_CLIENT_ID!)
  authUrl.searchParams.set('redirect_uri', `${baseUrl}/api/nextengine/callback`)
  authUrl.searchParams.set('state', 'nextengine_auth_state')
  
  return Response.redirect(authUrl.toString())
}