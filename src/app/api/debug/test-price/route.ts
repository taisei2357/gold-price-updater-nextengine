import { PriceService } from '@/lib/price-service'

/**
 * 価格取得テスト用デバッグエンドポイント
 */
export async function GET() {
  try {
    console.log('🧪 Price extraction test starting...')
    
    const priceService = new PriceService()
    const prices = await priceService.fetchCurrentPrices()
    
    return Response.json({
      success: true,
      prices,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Price test failed:', error)
    return Response.json({
      success: false,
      error: 'Price extraction test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}