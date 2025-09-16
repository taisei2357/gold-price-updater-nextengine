import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * NextEngine 認証コールバック - 正しいエンドポイント使用
 * uid/state を受け取り /api_neauth でトークン取得
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

  const uid = searchParams.get('uid')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  console.log('📥 NextEngine callback received:', {
    hasUid: !!uid,
    hasState: !!state,
    hasError: !!error,
    uid: uid?.substring(0, 10) + '...',
    state: state?.substring(0, 10) + '...'
  })

  if (error) {
    console.error('❌ OAuth error:', error)
    return NextResponse.redirect(`${process.env.BASE_URL}/?error=oauth_${error}`)
  }

  if (!uid || !state) {
    console.error('❌ Missing uid or state')
    return NextResponse.redirect(`${process.env.BASE_URL}/?error=missing_uid_state`)
  }

  try {
    console.log('🔄 Exchanging uid/state for tokens...')
    
    const clientId = process.env.NE_CLIENT_ID!
    const clientSecret = process.env.NE_CLIENT_SECRET!
    
    // NextEngine正式トークン取得エンドポイント
    const tokenResponse = await fetch('https://api.next-engine.org/api_neauth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        uid,
        state,
        client_id: clientId,
        client_secret: clientSecret
      })
    })

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`)
    }

    const tokenData = await tokenResponse.json()
    
    console.log('🎯 Token response:', {
      result: tokenData.result,
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      companyId: tokenData.company_ne_id
    })
    
    if (tokenData.result !== 'success') {
      throw new Error(`NextEngine auth failed: ${tokenData.code} - ${tokenData.message}`)
    }

    if (!tokenData.access_token || !tokenData.refresh_token) {
      throw new Error('Missing tokens in response')
    }

    // トークンをDBに保存
    await db.nextEngineToken.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        clientId: clientId,
        clientSecret: clientSecret
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        clientId: clientId,
        clientSecret: clientSecret
      }
    })

    console.log('✅ Tokens saved successfully to database')

    return NextResponse.redirect(`${process.env.BASE_URL}/?connected=1`)

  } catch (error) {
    console.error('❌ Token exchange failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(`${process.env.BASE_URL}/?error=token_exchange&details=${encodeURIComponent(errorMessage)}`)
  }
}