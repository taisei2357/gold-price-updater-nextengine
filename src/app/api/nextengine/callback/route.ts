import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

/**
 * NextEngine OAuth認証コールバック
 * トークンをDBに保存
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // ヘルスチェック用
  if (searchParams.get('health')) {
    return Response.json({ 
      ok: true, 
      message: 'Callback endpoint is healthy',
      timestamp: new Date().toISOString()
    })
  }

  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return Response.json({ 
      success: false, 
      error: `OAuth Error: ${error}` 
    }, { status: 400 })
  }

  if (!code) {
    return Response.json({ 
      success: false, 
      error: 'Missing authorization code in callback',
      received: {
        code: !!code,
        state: !!state,
        uid: !!searchParams.get('uid'),
        id: !!searchParams.get('id')
      }
    }, { status: 400 })
  }

  // state検証（セキュリティ上重要）
  const expectedState = process.env.NE_STATE || 'nextengine_auth_state'
  if (state !== expectedState) {
    return Response.json({ 
      success: false, 
      error: 'Invalid state parameter',
      received: state,
      expected: expectedState
    }, { status: 400 })
  }

  // 認可コードをアクセストークンに交換
  try {
    console.log('Exchanging authorization code for tokens...')
    
    const tokenResponse = await fetch('https://api.next-engine.org/api_v1_oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NE_CLIENT_ID!,
        client_secret: process.env.NE_CLIENT_SECRET!,
        code: code,
        redirect_uri: `${process.env.BASE_URL}/api/nextengine/callback`
      })
    })

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`)
    }

    const tokenData = await tokenResponse.json()
    
    if (!tokenData.access_token || !tokenData.refresh_token) {
      throw new Error('Invalid token response')
    }

    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token

    console.log('Tokens received successfully, saving to database...')

    // トークンをDBに保存
    await db.nextEngineToken.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        accessToken,
        refreshToken,
        clientId: process.env.NE_CLIENT_ID,
        clientSecret: process.env.NE_CLIENT_SECRET
      },
      update: {
        accessToken,
        refreshToken
      }
    })

    return Response.json({
      success: true,
      message: 'Tokens saved successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Failed to exchange tokens or save to database:', error)
    return Response.json({
      success: false,
      error: 'Failed to process OAuth callback',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}