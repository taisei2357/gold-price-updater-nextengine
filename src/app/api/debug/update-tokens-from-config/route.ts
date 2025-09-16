import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

/**
 * config.jsonから新しいトークンでデータベースを更新
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Updating tokens from config.json...')

    // config.jsonから取得したトークン情報
    const freshTokens = {
      accessToken: "876e1db66003f2ce1ee90288292b9de12d8411eb3dedbbe8e9402d4059ee1b52dd6b6cc3ec8f35cd418986556cbc64160ec2fb651916b099f16a2180cf221a7a",
      refreshToken: "80fb2d83672be277a51698a1a4c5602edcc29ab85c3261f09942ac1c881a09b1a230451e5728d6395df91a761bee3a3112999969c8319fc9262db64649dfcb8e",
      clientId: "QKGOil3mR6e1Bz",
      clientSecret: "e9nK2iTkfjobha1B3SHwGWyrMvxAEd6uUQI8NPql"
    }

    // 現在のトークンを確認
    const currentToken = await db.nextEngineToken.findFirst({
      where: { id: 1 }
    })

    console.log('Current token status:', {
      exists: !!currentToken,
      accessTokenLength: currentToken?.accessToken?.length,
      refreshTokenLength: currentToken?.refreshToken?.length
    })

    // データベースを新しいトークンで更新
    const updatedToken = await db.nextEngineToken.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        accessToken: freshTokens.accessToken,
        refreshToken: freshTokens.refreshToken,
        clientId: freshTokens.clientId,
        clientSecret: freshTokens.clientSecret
      },
      update: {
        accessToken: freshTokens.accessToken,
        refreshToken: freshTokens.refreshToken,
        clientId: freshTokens.clientId,
        clientSecret: freshTokens.clientSecret
      }
    })

    console.log('✅ Tokens updated successfully')

    return Response.json({
      success: true,
      message: 'Tokens updated from config.json',
      tokenInfo: {
        accessTokenLength: updatedToken.accessToken.length,
        refreshTokenLength: updatedToken.refreshToken.length,
        hasClientId: !!updatedToken.clientId,
        hasClientSecret: !!updatedToken.clientSecret
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Failed to update tokens:', error)
    return Response.json({
      success: false,
      error: 'Failed to update tokens from config',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return Response.json({
    message: 'Use POST method to update tokens from config.json'
  })
}