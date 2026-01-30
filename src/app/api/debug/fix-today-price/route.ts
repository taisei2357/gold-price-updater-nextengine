import { PriceService } from '@/lib/price-service'

/**
 * 今日の価格データを正しい値に修正
 */
export async function POST() {
  try {
    console.log('🔄 Fixing today\'s price data...')
    
    const priceService = new PriceService()
    
    // 田中貴金属から最新の価格を取得
    const currentPrices = await priceService.fetchCurrentPrices()
    console.log('Current prices from Tanaka:', currentPrices)
    
    // 今日の価格を正しい値で上書き保存
    await priceService.savePriceHistory(currentPrices)
    
    console.log('✅ Today\'s price data fixed')
    
    return Response.json({
      success: true,
      message: 'Today\'s price data fixed',
      correctedPrices: currentPrices,
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