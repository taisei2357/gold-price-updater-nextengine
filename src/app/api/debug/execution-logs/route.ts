import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

/**
 * 実行ログを取得してデバッグ
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching execution logs...')

    // 最新の実行ログを取得（最新20件）
    const executionLogs = await db.executionLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    // 最後の成功した価格更新を特定
    const lastSuccessfulUpdate = executionLogs.find(log => 
      log.status === 'SUCCESS' && log.updatedProducts > 0
    )

    // 最新の実行（成功・失敗問わず）
    const lastExecution = executionLogs[0]

    // 統計情報
    const stats = {
      totalLogs: executionLogs.length,
      successCount: executionLogs.filter(log => log.status === 'SUCCESS').length,
      failedCount: executionLogs.filter(log => log.status === 'FAILED').length,
      skippedCount: executionLogs.filter(log => log.status === 'SKIPPED').length
    }

    return Response.json({
      success: true,
      data: {
        lastSuccessfulUpdate: lastSuccessfulUpdate ? {
          date: lastSuccessfulUpdate.date,
          updatedProducts: lastSuccessfulUpdate.updatedProducts,
          goldRatio: lastSuccessfulUpdate.goldRatio,
          platinumRatio: lastSuccessfulUpdate.platinumRatio,
          executionReason: lastSuccessfulUpdate.executionReason,
          createdAt: lastSuccessfulUpdate.createdAt
        } : null,
        lastExecution: lastExecution ? {
          date: lastExecution.date,
          status: lastExecution.status,
          updatedProducts: lastExecution.updatedProducts,
          executionReason: lastExecution.executionReason,
          errorMessage: lastExecution.errorMessage,
          skippedReason: lastExecution.skippedReason,
          createdAt: lastExecution.createdAt
        } : null,
        stats,
        recentLogs: executionLogs.slice(0, 10).map(log => ({
          date: log.date,
          status: log.status,
          updatedProducts: log.updatedProducts,
          executionReason: log.executionReason,
          errorMessage: log.errorMessage,
          skippedReason: log.skippedReason,
          createdAt: log.createdAt
        })),
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Failed to fetch execution logs:', error)
    return Response.json({
      success: false,
      error: 'Failed to fetch execution logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}