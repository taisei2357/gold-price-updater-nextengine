import { NextEngineClient } from './src/lib/nextengine-client'
import { PriceService } from './src/lib/price-service'

async function main() {
  console.log('🔍 本番環境の対象商品を確認中...\n')

  const client = new NextEngineClient()
  const priceService = new PriceService()

  try {
    // 全商品を取得（最大200件ずつ）
    let offset = 0
    const limit = 200
    let allProducts: any[] = []

    while (true) {
      console.log(`📦 取得中... (offset: ${offset})`)
      const result = await client.getProducts(limit, offset)

      if (!result.data || result.data.length === 0) break

      allProducts = allProducts.concat(result.data)

      if (result.data.length < limit) break
      offset += limit

      // API制限対策で少し待機
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log(`\n✅ 全商品数: ${allProducts.length}件`)

    // 対象商品（【新品】K18）をフィルタリング
    const targetProducts = allProducts.filter(product =>
      priceService.shouldUpdateProduct(product.goods_name)
    )

    console.log(`✅ 対象商品数（【新品】K18）: ${targetProducts.length}件\n`)

    // 対象商品のサンプル表示（最初の10件）
    console.log('📋 対象商品のサンプル（最初の10件）:')
    targetProducts.slice(0, 10).forEach((product, index) => {
      console.log(`${index + 1}. [${product.goods_id}] ${product.goods_name}`)
      console.log(`   販売価格: ¥${product.goods_selling_price}`)
    })

    if (targetProducts.length > 10) {
      console.log(`\n... 他 ${targetProducts.length - 10}件`)
    }

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit())
