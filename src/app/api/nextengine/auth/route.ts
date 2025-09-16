import { NextRequest } from 'next/server'

/**
 * NextEngine OAuth認証開始
 */
export async function GET(request: NextRequest) {
  // NextEngineの必須パラメータを環境変数から取得
  const clientId = process.env.NE_CLIENT_ID!
  const uid = process.env.NE_UID!
  const appId = process.env.NE_APP_ID!
  const state = process.env.NE_STATE || 'nextengine_auth_state'
  
  if (!uid || !appId) {
    return Response.json({
      error: 'Missing NextEngine configuration',
      message: 'NE_UID and NE_APP_ID environment variables are required'
    }, { status: 500 })
  }
  
  // NextEngine専用の認証URL
  const authUrl = new URL('https://base.next-engine.org/Userjyouhou/app_search')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('uid', uid)
  authUrl.searchParams.set('id', appId)
  authUrl.searchParams.set('state', state)
  
  return Response.redirect(authUrl.toString())
}