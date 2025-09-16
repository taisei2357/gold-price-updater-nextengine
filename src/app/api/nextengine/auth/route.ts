import { NextRequest, NextResponse } from 'next/server'

/**
 * NextEngine 認証開始 - 正しいエンドポイント使用
 * uid/state を取得するため /users/sign_in/ を使用
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.NE_CLIENT_ID!
  const appUrl = process.env.BASE_URL!
  
  if (!clientId || !appUrl) {
    return Response.json({
      error: 'Missing NextEngine configuration',
      message: 'NE_CLIENT_ID and BASE_URL environment variables are required'
    }, { status: 500 })
  }
  
  // NextEngine正式認証エンドポイント
  const authUrl = new URL('https://base.next-engine.org/users/sign_in/')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', `${appUrl}/api/nextengine/callback`)
  
  console.log('🚀 Starting NextEngine auth with:', {
    clientId,
    redirectUri: `${appUrl}/api/nextengine/callback`
  })
  
  return NextResponse.redirect(authUrl.toString())
}