import { PriceService } from '@/lib/price-service'
import { db } from '@/lib/db'

/**
 * 価格履歴を初期化（初回セットアップ用）
 */
export async function POST() {
  try {
    console.log('🔄 Initializing price history...')
    
    const priceService = new PriceService()
    const currentPrices = await priceService.fetchCurrentPrices()
    
    // 今日の価格を保存
    await priceService.savePriceHistory(currentPrices)
    
    // 前営業日用のダミーデータも作成（価格変動計算用）
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    
    await db.priceHistory.upsert({
      where: { date: yesterday },
      create: {
        date: yesterday,
        goldPrice: currentPrices.gold - 100, // 前日は少し安い設定
        platinumPrice: currentPrices.platinum - 50
      },
      update: {
        goldPrice: currentPrices.gold - 100,
        platinumPrice: currentPrices.platinum - 50
      }
    })
    
    console.log('✅ Price history initialized')
    
    return Response.json({
      success: true,
      message: 'Price history initialized',
      currentPrices,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Price history init failed:', error)
    return Response.json({
      success: false,
      error: 'Price history initialization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}