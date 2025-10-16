import { NextRequest } from 'next/server'
import { PriceService } from '@/lib/price-service'

/**
 * 外部プラットフォーム価格同期状況確認・手動実行
 */
export async function GET(request: NextRequest) {
  const priceService = new PriceService()

  try {
    const status = await priceService.getPlatformSyncStatus()
    
    return Response.json({
      success: true,
      data: {
        lastSync: status.lastSync,
        recentSyncs: status.recentSyncs,
        message: '外部プラットフォーム同期状況取得完了'
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ 同期状況取得エラー:', errorMessage)

    return Response.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}

/**
 * 外部プラットフォーム価格同期手動実行
 * 最近更新された商品を対象に同期
 */
export async function POST(request: NextRequest) {
  const priceService = new PriceService()

  try {
    console.log('🔄 手動プラットフォーム同期開始...')
    
    // リクエストボディから同期対象商品を取得
    const body = await request.json()
    const { products } = body

    if (!products || !Array.isArray(products) || products.length === 0) {
      return Response.json({
        success: false,
        error: '同期対象商品が指定されていません'
      }, { status: 400 })
    }

    // 外部プラットフォーム同期実行
    const syncResult = await priceService.syncPricesToExternalPlatforms(products)

    return Response.json({
      success: syncResult.success,
      message: syncResult.message,
      details: syncResult.details
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ 手動プラットフォーム同期エラー:', errorMessage)

    return Response.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}