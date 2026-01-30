import { db } from '@/lib/db'

/**
 * 価格データを正しい値に手動修正
 */
export async function POST() {
  try {
    console.log('🔄 Fixing price data with correct values...')
    
    // 今日(1/16)の正しい価格: 25,955円(-43円)
    const today = new Date('2026-01-16T00:00:00.000Z')
    await db.priceHistory.upsert({
      where: { date: today },
      create: {
        date: today,
        goldPrice: 25955,
        platinumPrice: 13565,
        source: 'tanaka'
      },
      update: {
        goldPrice: 25955,
        platinumPrice: 13565
      }
    })
    
    // 昨日(1/15)の正しい価格: 25,998円
    const yesterday = new Date('2026-01-15T00:00:00.000Z')
    await db.priceHistory.upsert({
      where: { date: yesterday },
      create: {
        date: yesterday,
        goldPrice: 25998,
        platinumPrice: 13610,
        source: 'tanaka'
      },
      update: {
        goldPrice: 25998,
        platinumPrice: 13610
      }
    })
    
    // 計算確認
    const goldRatio = (25955 - 25998) / 25998
    const platinumRatio = (13565 - 13610) / 13610
    
    console.log('✅ Price data fixed with correct ratios')
    console.log(`Gold ratio: ${(goldRatio * 100).toFixed(4)}%`)
    console.log(`Platinum ratio: ${(platinumRatio * 100).toFixed(4)}%`)
    
    return Response.json({
      success: true,
      message: 'Price data fixed with correct values',
      corrections: {
        today: { date: '2026-01-16', gold: 25955, platinum: 13565 },
        yesterday: { date: '2026-01-15', gold: 25998, platinum: 13610 }
      },
      calculatedRatios: {
        gold: goldRatio,
        platinum: platinumRatio,
        goldPercent: `${(goldRatio * 100).toFixed(4)}%`,
        platinumPercent: `${(platinumRatio * 100).toFixed(4)}%`
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Price fix failed:', error)
    return Response.json({
      success: false,
      error: 'Price fix failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}