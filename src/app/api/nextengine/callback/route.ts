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

  const accessToken = searchParams.get('access_token')
  const refreshToken = searchParams.get('refresh_token')
  const error = searchParams.get('error')

  if (error) {
    return Response.json({ 
      success: false, 
      error: `OAuth Error: ${error}` 
    }, { status: 400 })
  }

  if (!accessToken || !refreshToken) {
    return Response.json({ 
      success: false, 
      error: 'Missing tokens in callback',
      received: {
        accessToken: !!accessToken,
        refreshToken: !!refreshToken
      }
    }, { status: 400 })
  }

  try {
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
    console.error('Failed to save tokens:', error)
    return Response.json({
      success: false,
      error: 'Failed to save tokens to database'
    }, { status: 500 })
  }
}