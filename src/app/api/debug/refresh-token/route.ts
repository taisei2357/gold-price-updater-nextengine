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
    
    return Response.json({
      success: testResult.result === 'success',
      message: testResult.result === 'success' ? 'Tokens are working' : 'Token test failed',
      testResult,
      currentTokenInfo: {
        accessTokenLength: currentToken.accessToken.length,
        refreshTokenLength: currentToken.refreshToken.length
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