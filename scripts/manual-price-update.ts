// scripts/manual-price-update.ts
// 手動で価格を更新するスクリプト
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 変更率を指定（-4% = -0.04）
const GOLD_RATIO = -0.04  // 金の変更率
const PLATINUM_RATIO = 0.0  // プラチナの変更率（変更しない場合は0）

interface Product {
  goods_id: string
  goods_name: string
  goods_selling_price: string
}

// 商品フィルタリング（K18のみ対象）
function shouldUpdateProduct(productName: string): boolean {
  const startsWithTarget = productName.startsWith('【新品】')
  const containsK18 = productName.includes('K18')

  return startsWithTarget && containsK18
}

// 金属種別を判定
function getMetalType(productName: string): 'gold' | 'platinum' | null {
  if (!shouldUpdateProduct(productName)) return null

  // K18のみ対象（K24とPtは除外）
  if (productName.includes('K18')) return 'gold'

  return null
}

// 10円単位に切り上げ
function roundUpToTen(price: number): number {
  return Math.ceil(price / 10) * 10
}

async function manualPriceUpdate() {
  const startTime = Date.now()

  try {
    console.log('🚀 手動価格更新開始\n')
    console.log(`📊 変更率:`)
    console.log(`   🥇 金: ${(GOLD_RATIO * 100).toFixed(2)}%`)
    console.log(`   🥈 プラチナ: ${(PLATINUM_RATIO * 100).toFixed(2)}%\n`)

    // マスタートークンを取得
    const masterToken = await prisma.nextEngineToken.findUnique({
      where: { id: 1 },
    })

    if (!masterToken) {
      throw new Error('マスタートークンが見つかりません')
    }

    console.log('📡 NextEngineから商品一覧を取得中...\n')

    let allProducts: Product[] = []
    let offset = 0
    const limit = 200

    // 全商品を取得
    while (true) {
      const params = new URLSearchParams({
        access_token: masterToken.accessToken,
        refresh_token: masterToken.refreshToken,
        fields: 'goods_id,goods_name,goods_selling_price',
        limit: limit.toString(),
        offset: offset.toString(),
      })

      const response = await fetch(
        'https://api.next-engine.org/api_v1_master_goods/search',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        }
      )

      const data = await response.json()

      // トークン更新
      if (data.access_token && data.refresh_token) {
        await prisma.nextEngineToken.update({
          where: { id: 1 },
          data: {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          },
        })
      }

      if (data.result !== 'success' || !data.data || data.data.length === 0) {
        break
      }

      allProducts.push(...data.data)
      offset += limit

      if (data.data.length < limit) break
    }

    console.log(`📦 全商品数: ${allProducts.length}件`)

    // 対象商品をフィルタリング
    const targetProducts = allProducts.filter((p) =>
      shouldUpdateProduct(p.goods_name || '')
    )

    console.log(`✅ 更新対象商品数: ${targetProducts.length}件\n`)

    // 価格更新を実行
    let updatedCount = 0
    let skippedCount = 0
    let failedCount = 0

    for (const product of targetProducts) {
      const metalType = getMetalType(product.goods_name)
      if (!metalType) {
        skippedCount++
        continue
      }

      const currentPrice = parseFloat(product.goods_selling_price)
      if (isNaN(currentPrice)) {
        skippedCount++
        continue
      }

      // 金属種別に応じて変動率を選択
      const ratio = metalType === 'gold' ? GOLD_RATIO : PLATINUM_RATIO

      // 変動率が0の場合はスキップ
      if (ratio === 0) {
        skippedCount++
        continue
      }

      const calculatedPrice = currentPrice * (1 + ratio)
      const newPrice = roundUpToTen(calculatedPrice)

      // 価格に変更がない場合はスキップ
      if (newPrice === currentPrice) {
        skippedCount++
        continue
      }

      try {
        const icon = metalType === 'gold' ? '🥇' : '🥈'
        console.log(
          `${icon} ${product.goods_name.substring(0, 40)}... ${currentPrice}円 → ${newPrice}円`
        )

        // 価格更新API呼び出し（CSV形式）
        const csvData = `syohin_code,baika_tnk\n${product.goods_id},${newPrice}`

        const updateParams = new URLSearchParams({
          access_token: masterToken.accessToken,
          refresh_token: masterToken.refreshToken,
          data_type: 'csv',
          data: csvData,
        })

        const updateResponse = await fetch(
          'https://api.next-engine.org/api_v1_master_goods/upload',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: updateParams.toString(),
          }
        )

        const updateData = await updateResponse.json()

        // トークン更新
        if (updateData.access_token && updateData.refresh_token) {
          await prisma.nextEngineToken.update({
            where: { id: 1 },
            data: {
              accessToken: updateData.access_token,
              refreshToken: updateData.refresh_token,
            },
          })
        }

        if (updateData.result === 'success') {
          updatedCount++
        } else {
          console.error(`   ❌ 失敗: ${updateData.message}`)
          failedCount++
        }

        // API制限対策
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`   ❌ エラー:`, error)
        failedCount++
      }
    }

    const duration = (Date.now() - startTime) / 1000

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ 手動価格更新完了\n')
    console.log(`📊 結果:`)
    console.log(`   更新成功: ${updatedCount}件`)
    console.log(`   スキップ: ${skippedCount}件`)
    console.log(`   失敗: ${failedCount}件`)
    console.log(`   実行時間: ${duration.toFixed(2)}秒`)
  } catch (error) {
    console.error('❌ エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

manualPriceUpdate()
