import { db } from './db'
import { NextEngineClient } from './nextengine-client'
import type { PriceHistoryData } from '@/types/nextengine'

export class PriceService {
  private nextEngineClient: NextEngineClient

  constructor() {
    this.nextEngineClient = new NextEngineClient()
  }
  /**
   * 田中貴金属から現在の金・プラチナ価格を取得
   */
  async fetchCurrentPrices(): Promise<{ gold: number; platinum: number }> {
    try {
      const response = await fetch('https://gold.tanaka.co.jp/commodity/souba/english/index.php', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NextEngine Price Updater)',
        }
      })
      
      const html = await response.text()
      
      // HTMLパース - 田中貴金属の実際の構造に対応
      // "19,230 yen" のような形式を抽出
      const goldMatch = html.match(/<tr class="gold">[\s\S]*?<td class="retail_tax">([0-9,]+) yen<\/td>/i)
      const platinumMatch = html.match(/<tr class="pt">[\s\S]*?<td class="retail_tax">([0-9,]+) yen<\/td>/i)
      
      console.log('Price extraction:', {
        goldMatch: goldMatch ? goldMatch[1] : 'not found',
        platinumMatch: platinumMatch ? platinumMatch[1] : 'not found'
      })
      
      if (!goldMatch) throw new Error('金価格が見つかりません')
      
      const goldPrice = parseFloat(goldMatch[1].replace(/,/g, ''))
      const platinumPrice = platinumMatch ? parseFloat(platinumMatch[1].replace(/,/g, '')) : 0
      
      return { gold: goldPrice, platinum: platinumPrice }
      
    } catch (error) {
      console.error('価格取得エラー:', error)
      throw new Error('価格情報の取得に失敗しました')
    }
  }

  /**
   * 価格履歴をDBに保存
   */
  async savePriceHistory(prices: { gold: number; platinum: number }): Promise<void> {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // 日付のみ
    
    await db.priceHistory.upsert({
      where: { date: today },
      create: {
        date: today,
        goldPrice: prices.gold,
        platinumPrice: prices.platinum
      },
      update: {
        goldPrice: prices.gold,
        platinumPrice: prices.platinum
      }
    })
  }

  /**
   * 前営業日の価格を取得
   */
  async getPreviousBusinessDayPrice(): Promise<{ gold: number; platinum: number } | null> {
    // 過去7日間から前営業日を探す
    for (let daysBack = 1; daysBack <= 7; daysBack++) {
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() - daysBack)
      targetDate.setHours(0, 0, 0, 0)

      const priceRecord = await db.priceHistory.findUnique({
        where: { date: targetDate }
      })

      if (priceRecord) {
        return {
          gold: priceRecord.goldPrice,
          platinum: priceRecord.platinumPrice || 0
        }
      }
    }

    return null
  }

  /**
   * 価格変動率を計算
   */
  calculatePriceChangeRatio(current: number, previous: number): number {
    if (previous === 0) return 0
    return (current - previous) / previous
  }

  /**
   * 営業日判定（土日祝日チェック）
   */
  isBusinessDay(date: Date = new Date()): boolean {
    const weekday = date.getDay() // 0=日曜, 1=月曜, ..., 6=土曜
    
    // 土日チェック
    if (weekday === 0 || weekday === 6) return false
    
    // 日本の祝日チェック（2025-2027年）
    const holidays = [
      // 2025年
      '2025-01-01', // 元日
      '2025-01-13', // 成人の日
      '2025-02-11', // 建国記念の日
      '2025-02-23', // 天皇誕生日
      '2025-02-24', // 天皇誕生日 振替
      '2025-03-20', // 春分の日
      '2025-04-29', // 昭和の日
      '2025-05-03', // 憲法記念日
      '2025-05-04', // みどりの日
      '2025-05-05', // こどもの日
      '2025-05-06', // みどりの日 振替
      '2025-07-21', // 海の日
      '2025-08-11', // 山の日
      '2025-09-15', // 敬老の日
      '2025-09-23', // 秋分の日
      '2025-10-13', // スポーツの日
      '2025-11-03', // 文化の日
      '2025-11-23', // 勤労感謝の日

      // 2026年
      '2026-01-01', // 元日
      '2026-01-02', // 振替休日（元日の振替）
      '2026-01-03', // 三が日（田中貴金属サイト更新なし）
      '2026-01-12', // 成人の日
      '2026-02-11', // 建国記念の日
      '2026-02-23', // 天皇誕生日
      '2026-03-20', // 春分の日
      '2026-04-29', // 昭和の日
      '2026-05-03', // 憲法記念日
      '2026-05-04', // みどりの日
      '2026-05-05', // こどもの日
      '2026-05-06', // 振替休日
      '2026-07-20', // 海の日
      '2026-08-11', // 山の日
      '2026-09-21', // 敬老の日
      '2026-09-22', // 秋分の日（振替休日）
      '2026-09-23', // 秋分の日
      '2026-10-12', // スポーツの日
      '2026-11-03', // 文化の日
      '2026-11-23', // 勤労感謝の日

      // 2027年
      '2027-01-01', // 元日
      '2027-01-02', // 三が日（田中貴金属サイト更新なし）
      '2027-01-03', // 三が日（田中貴金属サイト更新なし）
      '2027-01-11', // 成人の日
      '2027-02-11', // 建国記念の日
      '2027-02-23', // 天皇誕生日
      '2027-03-21', // 春分の日
      '2027-04-29', // 昭和の日
      '2027-05-03', // 憲法記念日
      '2027-05-04', // みどりの日
      '2027-05-05', // こどもの日
      '2027-07-19', // 海の日
      '2027-08-11', // 山の日
      '2027-09-20', // 敬老の日
      '2027-09-23', // 秋分の日
      '2027-10-11', // スポーツの日
      '2027-11-03', // 文化の日
      '2027-11-23', // 勤労感謝の日
    ]
    
    const dateString = date.toISOString().split('T')[0]
    return !holidays.includes(dateString)
  }

  /**
   * 価格を10円単位で切り上げ
   */
  roundUpToTen(price: number): number {
    return Math.ceil(price / 10) * 10
  }

  /**
   * 商品名フィルタリング
   */
  shouldUpdateProduct(productName: string): boolean {
    // 「【新品】」で始まり、「K18」を含む商品のみ対象
    // K24とPtは対象外
    // 中古商品は一時的に対象外
    const startsWithTarget = productName.startsWith('【新品】')
                            // productName.startsWith('【新品仕上げ中古】') ||
                            // productName.startsWith('【中古A】') ||
                            // productName.startsWith('【中古B】') ||
                            // productName.startsWith('【中古C】')
    const containsK18 = productName.includes('K18')

    return startsWithTarget && containsK18
  }

  /**
   * 商品の金属種別を判定
   */
  getMetalType(productName: string): 'gold' | 'platinum' | null {
    if (!this.shouldUpdateProduct(productName)) return null

    // K18のみ対象（K24とPtは除外）
    if (productName.includes('K18')) return 'gold'

    return null
  }

  /**
   * Amazon・Yahoo!ショップへの価格同期（商品マスタアップロードAPI使用）
   */
  async syncPricesToExternalPlatforms(updatedProducts: Array<{
    goodsId: string
    goodsName: string
    newPrice: number
    metalType: 'gold' | 'platinum'
  }>): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      console.log('🔄 外部プラットフォーム価格同期開始...')
      console.log(`対象商品数: ${updatedProducts.length}件`)

      if (updatedProducts.length === 0) {
        return { success: true, message: '同期対象商品なし' }
      }

      // バッチサイズを50件に制限（エラー006005対策）
      const BATCH_SIZE = 50
      const batches = this.createBatches(updatedProducts, BATCH_SIZE)
      
      console.log(`📦 ${batches.length}個のバッチに分割（バッチサイズ: ${BATCH_SIZE}）`)

      const allResults: any[] = []
      let successfulBatches = 0
      let totalProcessedProducts = 0

      // 各バッチを順次処理
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        console.log(`🔄 バッチ ${i + 1}/${batches.length} 処理開始（${batch.length}件）`)

        const batchResult = await this.processBatchWithRetry(batch, i + 1)
        
        allResults.push({
          batchNumber: i + 1,
          productCount: batch.length,
          ...batchResult
        })

        if (batchResult.success) {
          successfulBatches++
          totalProcessedProducts += batch.length
        }

        // バッチ間で1秒待機（API制限対策）
        if (i < batches.length - 1) {
          await this.delay(1000)
        }
      }

      const overallSuccess = successfulBatches > 0
      const message = `${totalProcessedProducts}/${updatedProducts.length}商品の価格同期完了 (${successfulBatches}/${batches.length}バッチ成功)`

      // 同期ログをDBに保存
      await this.savePlatformSyncLog({
        syncedAt: new Date(),
        productCount: totalProcessedProducts,
        status: overallSuccess ? 'success' : 'error',
        details: allResults,
        error: overallSuccess ? undefined : '一部またはすべてのバッチが失敗しました'
      })

      return {
        success: overallSuccess,
        message,
        details: allResults
      }

    } catch (error) {
      console.error('❌ 外部プラットフォーム価格同期エラー:', error)
      
      // エラーログ保存
      await this.savePlatformSyncLog({
        syncedAt: new Date(),
        productCount: updatedProducts.length,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      return {
        success: false,
        message: `外部プラットフォーム価格同期失敗: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * 配列を指定サイズのバッチに分割
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * バッチ処理をリトライ機能付きで実行
   */
  private async processBatchWithRetry(
    batch: Array<{goodsId: string, goodsName: string, newPrice: number, metalType: 'gold' | 'platinum'}>,
    batchNumber: number,
    maxRetries: number = 3
  ): Promise<{success: boolean, message: string, details?: any, retryCount?: number}> {
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 バッチ${batchNumber} 試行${attempt}/${maxRetries}`)

        // 商品マスタアップロードAPI用のCSVデータ作成
        const csvData = this.createProductMasterCsvData(batch)
        
        // 商品マスタアップロードAPI実行
        const uploadResult = await this.nextEngineClient.callApi('/api_v1_master_goods/upload', {
          data_type: 'csv',
          data: csvData
        })

        console.log(`📤 バッチ${batchNumber} アップロード結果:`, uploadResult)

        if (uploadResult && uploadResult.result === 'success') {
          console.log(`✅ バッチ${batchNumber} 同期完了（試行${attempt}）`)
          return {
            success: true,
            message: `バッチ${batchNumber} 同期成功`,
            details: uploadResult,
            retryCount: attempt - 1
          }
        } else {
          // エラー006005の場合はリトライ
          if (uploadResult?.code === '006005') {
            console.warn(`⚠️ バッチ${batchNumber} エラー006005（試行${attempt}）: ${uploadResult.message}`)
            if (attempt < maxRetries) {
              const delayMs = 2000 * attempt // 試行回数に応じて待機時間を増加
              console.log(`⏳ ${delayMs}ms 待機後にリトライします...`)
              await this.delay(delayMs)
              continue
            }
          }
          
          throw new Error(`バッチ${batchNumber} アップロード失敗: ${JSON.stringify(uploadResult)}`)
        }

      } catch (error) {
        console.error(`❌ バッチ${batchNumber} 試行${attempt} エラー:`, error)
        
        if (attempt < maxRetries) {
          const delayMs = 2000 * attempt
          console.log(`⏳ ${delayMs}ms 待機後にリトライします...`)
          await this.delay(delayMs)
          continue
        }
        
        return {
          success: false,
          message: `バッチ${batchNumber} 最大リトライ回数超過`,
          details: error instanceof Error ? error.message : 'Unknown error',
          retryCount: maxRetries
        }
      }
    }

    return {
      success: false,
      message: `バッチ${batchNumber} 処理失敗`,
      retryCount: maxRetries
    }
  }

  /**
   * 指定時間待機
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 商品マスタアップロード用CSVデータ作成
   * NextEngineサポート回答に基づき正しいフィールド名を使用
   */
  private createProductMasterCsvData(products: Array<{
    goodsId: string
    goodsName: string
    newPrice: number
    metalType: 'gold' | 'platinum'
  }>): string {
    // CSVヘッダー（NextEngine正式フィールド名を使用）
    // syohin_code: 商品コード, baika_tnk: 売価
    // org1=Amazon価格, org2=Yahoo価格, org3=楽天価格
    const header = 'syohin_code,baika_tnk,org1,org2,org3'
    
    // 各商品のCSV行を作成
    const rows = products.map(product => {
      return [
        product.goodsId,     // syohin_code: 商品コード
        product.newPrice,    // baika_tnk: メイン売価
        product.newPrice,    // org1: Amazon価格（項目1）
        product.newPrice,    // org2: Yahoo価格（項目2）
        product.newPrice     // org3: 楽天価格（項目3）
      ].join(',')
    })

    return [header, ...rows].join('\n')
  }

  /**
   * プラットフォーム同期ログをDBに保存
   */
  private async savePlatformSyncLog(logData: {
    syncedAt: Date
    productCount: number
    status: 'success' | 'error'
    details?: any
    error?: string
  }): Promise<void> {
    try {
      await db.platformSyncLog.create({
        data: {
          syncedAt: logData.syncedAt,
          productCount: logData.productCount,
          status: logData.status,
          details: logData.details ? JSON.stringify(logData.details) : null,
          errorMessage: logData.error || null
        }
      })
    } catch (error) {
      console.error('プラットフォーム同期ログ保存エラー:', error)
    }
  }

  /**
   * 外部プラットフォーム同期状況の確認
   */
  async getPlatformSyncStatus(): Promise<{
    lastSync: Date | null
    recentSyncs: Array<{
      syncedAt: Date
      productCount: number
      status: string
      errorMessage?: string
    }>
  }> {
    try {
      const recentSyncs = await db.platformSyncLog.findMany({
        orderBy: { syncedAt: 'desc' },
        take: 10,
        select: {
          syncedAt: true,
          productCount: true,
          status: true,
          errorMessage: true
        }
      })

      const lastSync = recentSyncs.length > 0 ? recentSyncs[0].syncedAt : null

      // null を undefined に変換
      const formattedSyncs = recentSyncs.map(sync => ({
        syncedAt: sync.syncedAt,
        productCount: sync.productCount,
        status: sync.status,
        errorMessage: sync.errorMessage || undefined
      }))

      return {
        lastSync,
        recentSyncs: formattedSyncs
      }
    } catch (error) {
      console.error('プラットフォーム同期状況取得エラー:', error)
      return {
        lastSync: null,
        recentSyncs: []
      }
    }
  }
}