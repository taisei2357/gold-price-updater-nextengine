import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

/**
 * データベース状態をデバッグ
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debugging database status...')

    // トークンテーブルを直接確認
    let tokenStatus
    try {
      const token = await db.nextEngineToken.findFirst({
        where: { id: 1 }
      })
      tokenStatus = {
        found: !!token,
        hasAccessToken: !!token?.accessToken,
        hasRefreshToken: !!token?.refreshToken,
        createdAt: token?.createdAt,
        accessTokenLength: token?.accessToken?.length,
        refreshTokenLength: token?.refreshToken?.length
      }
    } catch (tokenError) {
      tokenStatus = { error: tokenError instanceof Error ? tokenError.message : 'Unknown token error' }
    }

    // 他のテーブルも確認
    let otherTables
    try {
      const priceCount = await db.priceHistory.count()
      const executionCount = await db.executionLog.count()  
      const keepAliveCount = await db.keepAliveLog.count()
      
      otherTables = {
        priceHistory: priceCount,
        executionLog: executionCount,
        keepAliveLog: keepAliveCount
      }
    } catch (tablesError) {
      otherTables = { error: tablesError instanceof Error ? tablesError.message : 'Unknown tables error' }
    }

    // 環境変数確認
    const envStatus = {
      hasClientId: !!process.env.NE_CLIENT_ID,
      hasClientSecret: !!process.env.NE_CLIENT_SECRET,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasInitialTokens: !!(process.env.INITIAL_ACCESS_TOKEN && process.env.INITIAL_REFRESH_TOKEN)
    }

    return Response.json({
      success: true,
      debug: {
        tokenStatus,
        otherTables,
        envStatus,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Debug failed:', error)
    return Response.json({
      success: false,
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}