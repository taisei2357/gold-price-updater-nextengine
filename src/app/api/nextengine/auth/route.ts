import { NextRequest } from 'next/server'

/**
 * NextEngine OAuth認証開始
 */
export async function GET(request: NextRequest) {
  // NextEngineの必須パラメータを環境変数から取得
  const clientId = process.env.NE_CLIENT_ID!
  const baseUrl = process.env.BASE_URL!
  const state = process.env.NE_STATE || 'nextengine_auth_state'
  
  if (!clientId || !baseUrl) {
    return Response.json({
      error: 'Missing NextEngine configuration',
      message: 'NE_CLIENT_ID and BASE_URL environment variables are required'
    }, { status: 500 })
  }
  
  // 標準的なOAuth2 authorize エンドポイント
  const authUrl = new URL('https://base.next-engine.org/apps/oauth2/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', `${baseUrl}/api/nextengine/callback`)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('state', state)
  
  return Response.redirect(authUrl.toString())
}