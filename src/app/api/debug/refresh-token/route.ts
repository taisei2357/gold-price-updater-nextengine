import { NextRequest } from 'next/server'
import { NextEngineClient } from '@/lib/nextengine-client'
import { db } from '@/lib/db'

/**
 * 手動トークンリフレッシュテスト
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Manual token refresh test...')

    // 現在のトークンを取得
    const currentToken = await db.nextEngineToken.findFirst({
      where: { id: 1 }
    })

    if (!currentToken) {
      return Response.json({
        success: false,
        error: 'No tokens found in database'
      }, { status: 404 })
    }

    console.log('Current tokens:', {
      hasAccessToken: !!currentToken.accessToken,
      hasRefreshToken: !!currentToken.refreshToken,
      accessTokenLength: currentToken.accessToken?.length,
      refreshTokenLength: currentToken.refreshToken?.length
    })

    // NextEngineのAPI呼び出しでトークンが自動更新されるかテスト
    const client = new NextEngineClient()
    const testResult = await client.callApi('/api_v1_login_user/info')
    
    if (testResult.result === 'success') {
      return Response.json({
        success: true,
        message: 'Tokens are working fine',
        testResult
      })
    }
    
    // エラーの場合は詳細を返す
    const response = { ok: false, status: 400, statusText: 'Token test failed' }

    console.log('Refresh response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Refresh failed:', errorText)
      return Response.json({
        success: false,
        error: `Token refresh failed: ${response.status} ${response.statusText}`,
        details: errorText
      }, { status: 500 })
    }

    const tokenData = await response.json()
    console.log('New token data:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      result: tokenData.result,
      message: tokenData.message
    })

    if (!tokenData.access_token || !tokenData.refresh_token) {
      return Response.json({
        success: false,
        error: 'Invalid token response from refresh',
        tokenData
      }, { status: 500 })
    }

    // 新しいトークンをデータベースに保存
    await db.nextEngineToken.update({
      where: { id: 1 },
      data: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token
      }
    })

    console.log('✅ Tokens updated successfully')

    // NextEngineClientでテスト
    const client = new NextEngineClient()
    const testResult = await client.keepAlive()

    return Response.json({
      success: true,
      message: 'Token refreshed successfully',
      refreshResult: {
        oldTokenLength: currentToken.accessToken.length,
        newTokenLength: tokenData.access_token.length,
        testResult
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Manual refresh failed:', error)
    return Response.json({
      success: false,
      error: 'Manual token refresh failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return Response.json({
    message: 'Use POST method to manually refresh tokens'
  })
}