import { NextRequest } from 'next/server'
import { NextEngineClient } from '@/lib/nextengine-client'
import { PriceService } from '@/lib/price-service'

/**
 * 実商品データでプラットフォーム同期テスト用エンドポイント
 */
export async function POST(request: NextRequest) {
  const nextEngineClient = new NextEngineClient()
  const priceService = new PriceService()

  try {
    console.log('🔍 実商品データ取得開始...')
    
    // NextEngineから商品情報を取得（最大5件で制限）
    const productsResult = await nextEngineClient.callApi('/api_v1_master_goods/search', {
      limit: '5',
      offset: '0',
      fields: 'goods_id,goods_name'
    })

    if (!productsResult || productsResult.result !== 'success' || !productsResult.data) {
      throw new Error(`商品データ取得失敗: ${JSON.stringify(productsResult)}`)
    }

    console.log(`📦 取得商品数: ${productsResult.data.length}件`)

    // 価格更新対象商品をフィルタリング
    const validProducts = productsResult.data
      .filter((product: any) => {
        return priceService.shouldUpdateProduct(product.goods_name || '') && 
               product.goods_id
      })
      .slice(0, 3) // 最大3件に制限
      .map((product: any) => ({
        goodsId: product.goods_id,
        goodsName: product.goods_name,
        newPrice: 50000, // テスト用固定価格
        metalType: priceService.getMetalType(product.goods_name) || 'gold'
      }))

    if (validProducts.length === 0) {
      return Response.json({
        success: false,
        message: '価格更新対象の商品が見つかりませんでした',
        allProducts: productsResult.data.map((p: any) => ({
          goodsId: p.goods_id,
          goodsName: p.goods_name,
          shouldUpdate: priceService.shouldUpdateProduct(p.goods_name || '')
        }))
      })
    }

    console.log('🧪 実商品プラットフォーム同期テスト開始...')
    console.log('対象商品:', validProducts)
    
    const syncResult = await priceService.syncPricesToExternalPlatforms(validProducts)

    return Response.json({
      success: true,
      message: '実商品プラットフォーム同期テスト完了',
      syncResult,
      testData: validProducts,
      totalProductsFound: productsResult.data.length,
      validProductsCount: validProducts.length
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ 実商品プラットフォーム同期テストエラー:', errorMessage)

    return Response.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}