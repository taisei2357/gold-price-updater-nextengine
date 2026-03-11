import { NextEngineClient } from './src/lib/nextengine-client'

async function main() {
  console.log('🔍 Testing NextEngine API connection...\n')

  const client = new NextEngineClient()

  try {
    console.log('📦 Fetching products from test environment...')
    const result = await client.getProducts(100, 0)

    console.log('\n✅ API Response:')
    console.log(`  Result: ${result.result}`)
    console.log(`  Count: ${result.count}`)
    console.log(`  Data length: ${result.data?.length || 0}`)

    if (result.data && result.data.length > 0) {
      console.log('\n📋 Sample products:')
      result.data.slice(0, 5).forEach((product: any) => {
        console.log(`  - [${product.goods_id}] ${product.goods_name}`)
        console.log(`    販売価格: ¥${product.goods_selling_price}`)
        console.log(`    原価: ¥${product.goods_cost_price}`)
      })
    }

    console.log(`\n✅ テスト環境で ${result.count || 0} 件の商品が取得できました！`)

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit())
