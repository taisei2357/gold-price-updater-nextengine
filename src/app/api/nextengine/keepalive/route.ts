import { NextRequest } from 'next/server'
import { NextEngineClient } from '@/lib/nextengine-client'
import { db } from '@/lib/db'

/**
 * NextEngine キープアライブ
 * 12時間ごとのVercel Cronで実行
 */
export async function GET(request: NextRequest) {
  // CRON認証（オプション）
  const authHeader = request.headers.get('authorization')
  const expectedAuth = process.env.CRON_SECRET
  
  if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = new NextEngineClient()

  try {
    console.log('🚀 NextEngine KeepAlive starting...')
    const startTime = Date.now()

    const result = await client.keepAlive()
    const duration = (Date.now() - startTime) / 1000

    // ログをDBに記録
    await db.keepAliveLog.create({
      data: {
        status: result.success ? 'SUCCESS' : 'FAILED',
        message: result.message
      }
    })

    console.log(`✅ KeepAlive completed: ${result.message} (${duration}s)`)

    return Response.json({
      success: result.success,
      message: result.message,
      refreshed: result.refreshed,
      duration: duration,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const duration = (Date.now() - Date.now()) / 1000
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('❌ KeepAlive failed:', errorMessage)

    // エラーログをDBに記録
    try {
      await db.keepAliveLog.create({
        data: {
          status: 'FAILED',
          message: errorMessage
        }
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return Response.json({
      success: false,
      error: errorMessage,
      duration: duration,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}