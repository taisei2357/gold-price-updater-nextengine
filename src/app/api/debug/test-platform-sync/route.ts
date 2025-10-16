import { NextRequest } from 'next/server'
import { PriceService } from '@/lib/price-service'

/**
 * プラットフォーム同期テスト用エンドポイント
 */
export async function GET(request: NextRequest) {
  const priceService = new PriceService()

  try {
    // テスト用の商品データ
    const testProducts = [
      {
        goodsId: 'TEST001',
        goodsName: '【新品】K18 テストネックレス',
        newPrice: 100000,
        metalType: 'gold' as const
      },
      {
        goodsId: 'TEST002', 
        goodsName: '【新品】Pt900 テストリング',
        newPrice: 80000,
        metalType: 'platinum' as const
      }
    ]

    console.log('🧪 プラットフォーム同期テスト開始...')
    
    const syncResult = await priceService.syncPricesToExternalPlatforms(testProducts)

    return Response.json({
      success: true,
      message: 'プラットフォーム同期テスト完了',
      syncResult,
      testData: testProducts
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ プラットフォーム同期テストエラー:', errorMessage)

    return Response.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}