import { NextEngineClient } from '@/lib/nextengine-client'

/**
 * NextEngineから商品一覧を取得してデバッグ
 */
export async function GET() {
  try {
    console.log('🔍 Fetching NextEngine products...')
    
    const client = new NextEngineClient()
    
    // 商品データを取得（より多くのフィールドを取得）
    const result = await client.callApi('/api_v1_master_goods/search', {
      fields: 'goods_id,goods_name,goods_selling_price,goods_cost_price,stock_quantity',
      limit: 500, // 最大500件まで取得
      offset: 0
    })
    
    if (result.result !== 'success') {
      throw new Error(`NextEngine API error: ${result.code} - ${result.message}`)
    }
    
    const products = result.data || []
    
    // 商品名で分類
    const analysis = {
      total: products.length,
      byCategory: {
        新品: products.filter((p: any) => p.goods_name?.startsWith('【新品】')).length,
        新品仕上げ: products.filter((p: any) => p.goods_name?.startsWith('【新品仕上げ')).length,
        その他: products.filter((p: any) => 
          !p.goods_name?.startsWith('【新品】') && 
          !p.goods_name?.startsWith('【新品仕上げ')
        ).length
      },
      samples: {
        新品: products.filter((p: any) => p.goods_name?.startsWith('【新品】')).slice(0, 5).map((p: any) => ({
          id: p.goods_id,
          name: p.goods_name?.substring(0, 50) + '...',
          price: p.goods_selling_price
        })),
        新品仕上げ: products.filter((p: any) => p.goods_name?.startsWith('【新品仕上げ')).slice(0, 5).map((p: any) => ({
          id: p.goods_id,
          name: p.goods_name?.substring(0, 50) + '...',
          price: p.goods_selling_price
        }))
      }
    }
    
    return Response.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Product list failed:', error)
    return Response.json({
      success: false,
      error: 'Failed to fetch product list',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}