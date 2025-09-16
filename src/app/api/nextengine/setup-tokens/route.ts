import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

/**
 * 既存トークンの初期セットアップ（一回限り実行）
 */
export async function POST(request: NextRequest) {
  // セキュリティチェック
  const authHeader = request.headers.get('authorization')
  const expectedAuth = process.env.CRON_SECRET
  
  if (!expectedAuth || authHeader !== `Bearer ${expectedAuth}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const initialAccessToken = process.env.INITIAL_ACCESS_TOKEN
  const initialRefreshToken = process.env.INITIAL_REFRESH_TOKEN
  
  if (!initialAccessToken || !initialRefreshToken) {
    return Response.json({ 
      error: 'Missing initial tokens',
      message: 'INITIAL_ACCESS_TOKEN and INITIAL_REFRESH_TOKEN environment variables are required'
    }, { status: 500 })
  }

  try {
    // 既存トークンがあるかチェック
    const existingToken = await db.nextEngineToken.findFirst({
      where: { id: 1 }
    })

    if (existingToken) {
      return Response.json({ 
        success: false,
        message: 'Tokens already exist in database',
        existing: {
          hasAccessToken: !!existingToken.accessToken,
          hasRefreshToken: !!existingToken.refreshToken,
          createdAt: existingToken.createdAt
        }
      })
    }

    // 初期トークンをDBに保存
    await db.nextEngineToken.create({
      data: {
        id: 1,
        accessToken: initialAccessToken,
        refreshToken: initialRefreshToken,
        clientId: process.env.NE_CLIENT_ID,
        clientSecret: process.env.NE_CLIENT_SECRET
      }
    })

    console.log('✅ Initial tokens saved to database')

    return Response.json({
      success: true,
      message: 'Initial tokens saved successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Failed to setup initial tokens:', error)
    return Response.json({
      success: false,
      error: 'Failed to save initial tokens to database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}