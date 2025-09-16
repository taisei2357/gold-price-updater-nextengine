import { NextRequest } from 'next/server'
import { NextEngineClient } from '@/lib/nextengine-client'
import { PriceService } from '@/lib/price-service'
import { db } from '@/lib/db'
import type { PriceUpdateResult, ExecutionResult } from '@/types/nextengine'

/**
 * NextEngine 価格更新
 * 平日10:00（JST）のVercel Cronで実行
 */
export async function GET(request: NextRequest) {
  // CRON認証（Cronジョブからの呼び出しのみ）
  const cronHeader = request.headers.get('x-vercel-cron')
  const authHeader = request.headers.get('authorization')
  const expectedAuth = process.env.CRON_SECRET
  
  // Cronジョブからの場合のみ認証チェック
  if (cronHeader && expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = new NextEngineClient()
  const priceService = new PriceService()
  const startTime = Date.now()

  try {
    console.log('🚀 NextEngine 価格更新開始')

    // キープアライブ実行（トークン維持）
    try {
      console.log('🔄 キープアライブ実行中...')
      await client.keepAlive()
      console.log('✅ キープアライブ完了')
    } catch (keepAliveError) {
      console.warn('⚠️ キープアライブエラー:', keepAliveError)
    }

    // 営業日チェック
    if (!priceService.isBusinessDay()) {
      const today = new Date().toLocaleDateString('ja-JP')
      const message = `${today}は土日祝日のため価格更新をスキップ`
      
      await logExecution({
        status: 'SKIPPED',
        updatedProducts: 0,
        executionReason: '自動実行',
        skippedReason: '土日祝日',
        durationSeconds: (Date.now() - startTime) / 1000
      })

      console.log(`📅 ${message}`)
      return Response.json({ 
        success: true, 
        message,
        skipped: true 
      })
    }

    // 現在価格を取得
    console.log('📊 現在価格取得中...')
    const currentPrices = await priceService.fetchCurrentPrices()
    
    // 価格履歴を保存
    await priceService.savePriceHistory(currentPrices)
    console.log(`💰 現在価格: 金=${currentPrices.gold}円/g, プラチナ=${currentPrices.platinum}円/g`)

    // 前営業日の価格を取得
    const previousPrices = await priceService.getPreviousBusinessDayPrice()
    if (!previousPrices) {
      throw new Error('前営業日の価格データが見つかりません')
    }

    // 価格変動率を計算
    const goldRatio = priceService.calculatePriceChangeRatio(currentPrices.gold, previousPrices.gold)
    const platinumRatio = priceService.calculatePriceChangeRatio(currentPrices.platinum, previousPrices.platinum)
    
    console.log(`📈 変動率: 金=${(goldRatio * 100).toFixed(4)}%, プラチナ=${(platinumRatio * 100).toFixed(4)}%`)

    // 閾値チェック（小さな変動でも更新）
    if (Math.abs(goldRatio) < 0.0001 && Math.abs(platinumRatio) < 0.0001) {
      const message = '価格変動が軽微のためスキップ'
      
      await logExecution({
        status: 'SKIPPED',
        updatedProducts: 0,
        goldRatio,
        platinumRatio,
        executionReason: '自動実行',
        skippedReason: message,
        durationSeconds: (Date.now() - startTime) / 1000
      })

      console.log(`💡 ${message}`)
      return Response.json({ 
        success: true, 
        message,
        goldRatio,
        platinumRatio,
        skipped: true 
      })
    }

    // 商品情報を取得して更新
    console.log('🔍 商品情報取得中...')
    const updateResults = await updateProductPrices(client, priceService, goldRatio)
    
    const updatedCount = updateResults.filter(r => r.success).length
    const failedCount = updateResults.filter(r => !r.success).length

    // 実行結果をログに記録
    await logExecution({
      status: updatedCount > 0 ? 'SUCCESS' : 'FAILED',
      updatedProducts: updatedCount,
      goldRatio,
      platinumRatio,
      executionReason: '自動実行',
      errorMessage: failedCount > 0 ? `${failedCount}件の更新に失敗` : undefined,
      durationSeconds: (Date.now() - startTime) / 1000
    })

    console.log(`✅ 価格更新完了: 成功=${updatedCount}件, 失敗=${failedCount}件`)

    return Response.json({
      success: true,
      message: '価格更新完了',
      results: {
        totalProducts: updateResults.length,
        updatedProducts: updatedCount,
        failedProducts: failedCount,
        goldRatio,
        platinumRatio,
        duration: (Date.now() - startTime) / 1000
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ 価格更新エラー:', errorMessage)

    // エラーログを記録
    try {
      await logExecution({
        status: 'FAILED',
        updatedProducts: 0,
        executionReason: '自動実行',
        errorMessage,
        durationSeconds: (Date.now() - startTime) / 1000
      })
    } catch (logError) {
      console.error('ログ記録エラー:', logError)
    }

    return Response.json({
      success: false,
      error: errorMessage,
      duration: (Date.now() - startTime) / 1000
    }, { status: 500 })
  }
}

/**
 * 商品価格を一括更新
 */
async function updateProductPrices(
  client: NextEngineClient,
  priceService: PriceService,
  goldRatio: number
): Promise<PriceUpdateResult[]> {
  const results: PriceUpdateResult[] = []
  let offset = 0
  const limit = 200

  while (true) {
    const response = await client.getProducts(limit, offset)
    
    if (response.result !== 'success' || !response.data || response.data.length === 0) {
      break
    }

    for (const product of response.data) {
      const productName = product.goods_name || ''
      
      // 商品フィルタリング
      if (!priceService.shouldUpdateProduct(productName)) {
        continue
      }

      try {
        const currentPrice = parseFloat(product.goods_selling_price)
        if (isNaN(currentPrice)) continue

        const calculatedPrice = currentPrice * (1 + goldRatio)
        const newPrice = priceService.roundUpToTen(calculatedPrice)

        // 価格に変更がない場合はスキップ
        if (newPrice === currentPrice) {
          continue
        }

        console.log(`🔄 更新: ${product.goods_id} ${currentPrice}円 → ${newPrice}円`)

        const updateResult = await client.updateProductPrice(product.goods_id, newPrice)
        
        results.push({
          productId: product.goods_id,
          productName,
          oldPrice: currentPrice,
          newPrice,
          success: updateResult.result === 'success',
          error: updateResult.result !== 'success' ? updateResult.message : undefined
        })

        // API制限対策
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({
          productId: product.goods_id,
          productName,
          oldPrice: 0,
          newPrice: 0,
          success: false,
          error: errorMessage
        })
      }
    }

    offset += limit
  }

  return results
}

/**
 * 実行結果をDBにログ
 */
async function logExecution(result: ExecutionResult): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  await db.executionLog.upsert({
    where: { date: today },
    create: {
      date: today,
      status: result.status,
      updatedProducts: result.updatedProducts,
      goldRatio: result.goldRatio,
      platinumRatio: result.platinumRatio,
      executionReason: result.executionReason,
      errorMessage: result.errorMessage,
      skippedReason: result.skippedReason,
      durationSeconds: result.durationSeconds
    },
    update: {
      status: result.status,
      updatedProducts: result.updatedProducts,
      goldRatio: result.goldRatio,
      platinumRatio: result.platinumRatio,
      executionReason: result.executionReason,
      errorMessage: result.errorMessage,
      skippedReason: result.skippedReason,
      durationSeconds: result.durationSeconds
    }
  })
}