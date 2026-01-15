import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

/**
 * 価格履歴を取得してデバッグ
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching price history...')

    // 最新の価格履歴を取得（最新20件）
    const priceHistory = await db.priceHistory.findMany({
      orderBy: { date: 'desc' },
      take: 20
    })

    // 最新の価格データ
    const latestPrice = priceHistory[0]

    // 今日の価格データがあるか確認
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayPrice = priceHistory.find(p => {
      const priceDate = new Date(p.date)
      priceDate.setHours(0, 0, 0, 0)
      return priceDate.getTime() === today.getTime()
    })

    return Response.json({
      success: true,
      data: {
        latestPrice: latestPrice ? {
          date: latestPrice.date,
          goldPrice: latestPrice.goldPrice,
          platinumPrice: latestPrice.platinumPrice,
          source: latestPrice.source,
          createdAt: latestPrice.createdAt
        } : null,
        todayPrice: todayPrice ? {
          date: todayPrice.date,
          goldPrice: todayPrice.goldPrice,
          platinumPrice: todayPrice.platinumPrice,
          source: todayPrice.source,
          createdAt: todayPrice.createdAt
        } : null,
        hasTodayPrice: !!todayPrice,
        totalRecords: priceHistory.length,
        recentPrices: priceHistory.slice(0, 7).map(price => ({
          date: price.date,
          goldPrice: price.goldPrice,
          platinumPrice: price.platinumPrice,
          source: price.source,
          createdAt: price.createdAt
        })),
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Failed to fetch price history:', error)
    return Response.json({
      success: false,
      error: 'Failed to fetch price history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}