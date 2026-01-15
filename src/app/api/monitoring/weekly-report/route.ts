import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { EmailNotifier } from '@/lib/email-notifier'

/**
 * 週次ヘルスレポート送信
 * 毎週月曜日の朝9時に実行
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

  const emailNotifier = new EmailNotifier()

  try {
    console.log('📊 Generating weekly health report...')

    // 過去7日間の統計を取得
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    // Keepalive統計
    const keepaliveLogs = await db.keepAliveLog.findMany({
      where: {
        createdAt: {
          gte: oneWeekAgo
        }
      }
    })

    const successfulKeepalives = keepaliveLogs.filter(log => log.status === 'SUCCESS').length
    const failedKeepalives = keepaliveLogs.filter(log => log.status === 'FAILED').length

    // 実行ログ統計
    const executionLogs = await db.executionLog.findMany({
      where: {
        createdAt: {
          gte: oneWeekAgo
        }
      }
    })

    const successfulPriceUpdates = executionLogs.filter(log => log.status === 'SUCCESS').length
    const failedPriceUpdates = executionLogs.filter(log => log.status === 'FAILED').length

    // 最後の成功した価格更新
    const lastSuccessfulUpdate = await db.executionLog.findFirst({
      where: {
        status: 'SUCCESS',
        updatedProducts: { gt: 0 }
      },
      orderBy: { createdAt: 'desc' }
    })

    // 統計データをまとめる
    const stats = {
      successfulKeepalives,
      failedKeepalives,
      successfulPriceUpdates,
      failedPriceUpdates,
      lastPriceUpdate: lastSuccessfulUpdate?.createdAt || null
    }

    // 週次レポートを送信
    const sent = await emailNotifier.sendWeeklyHealthReport(stats)

    console.log(`📧 Weekly health report sent: ${sent ? 'Success' : 'Failed'}`)

    return Response.json({
      success: true,
      message: 'Weekly health report generated and sent',
      stats,
      emailSent: sent,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Weekly report generation failed:', errorMessage)

    return Response.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}