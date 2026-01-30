import { NextRequest } from 'next/server'
import { NextEngineClient } from '@/lib/nextengine-client'
import { db } from '@/lib/db'
import { EmailNotifier } from '@/lib/email-notifier'

/**
 * NextEngine キープアライブ
 * 12時間ごとのVercel Cronで実行
 */
export async function GET(request: NextRequest) {
  // CRON認証（Cronジョブからの呼び出しのみ）
  const cronHeader = request.headers.get('x-vercel-cron')
  const authHeader = request.headers.get('authorization')
  const expectedAuth = process.env.CRON_SECRET
  
  // Cronジョブからの場合のみ認証チェック
  if (cronHeader && expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = new NextEngineClient()
  const emailNotifier = new EmailNotifier()
  const startTime = Date.now()

  try {
    console.log('🚀 NextEngine KeepAlive starting...')

    const result = await client.keepAlive()
    const duration = (Date.now() - startTime) / 1000

    // ログをDBに記録
    await db.keepAliveLog.create({
      data: {
        status: result.success ? 'SUCCESS' : 'FAILED',
        message: result.message
      }
    })

    // 成功時：システム復旧通知（前回失敗していた場合）
    if (result.success) {
      // 前回の実行が失敗していたかチェック
      const previousLog = await db.keepAliveLog.findFirst({
        where: { id: { not: (await db.keepAliveLog.findFirst({ orderBy: { id: 'desc' } }))?.id } },
        orderBy: { createdAt: 'desc' }
      })

      if (previousLog?.status === 'FAILED') {
        console.log('📧 Sending system recovery notification...')
        await emailNotifier.sendSystemRecovery()
      }
    } else {
      // 失敗時：連続失敗回数をカウントして通知
      const recentLogs = await db.keepAliveLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
      })
      
      let consecutiveFailures = 0
      for (const log of recentLogs) {
        if (log.status === 'FAILED') {
          consecutiveFailures++
        } else {
          break
        }
      }

      console.log(`📧 Sending keepalive failure notification (${consecutiveFailures} consecutive failures)...`)
      await emailNotifier.sendKeepAliveFailure(result.message, consecutiveFailures)

      // トークン期限切れの可能性をチェック
      if (result.message.includes('access_token') || result.message.includes('002002')) {
        console.log('📧 Sending token expiration warning...')
        await emailNotifier.sendTokenExpirationWarning()
      }
    }

    console.log(`✅ KeepAlive completed: ${result.message} (${duration}s)`)

    return Response.json({
      success: result.success,
      message: result.message,
      refreshed: result.refreshed,
      duration: duration,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const duration = (Date.now() - startTime) / 1000
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

      // 連続失敗回数をカウント
      const recentLogs = await db.keepAliveLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
      })
      
      let consecutiveFailures = 1 // 現在の失敗を含む
      for (let i = 1; i < recentLogs.length; i++) {
        if (recentLogs[i].status === 'FAILED') {
          consecutiveFailures++
        } else {
          break
        }
      }

      // メール通知送信
      console.log(`📧 Sending error notification (${consecutiveFailures} consecutive failures)...`)
      await emailNotifier.sendKeepAliveFailure(errorMessage, consecutiveFailures)

      // トークン関連エラーの場合は追加警告
      if (errorMessage.includes('access_token') || errorMessage.includes('002002') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        console.log('📧 Sending token expiration warning...')
        await emailNotifier.sendTokenExpirationWarning()
      }

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