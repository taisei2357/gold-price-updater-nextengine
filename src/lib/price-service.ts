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
    
    // 日本の祝日チェック（2025年）
    const holidays2025 = [
      '2025-01-01', // 元日
      '2025-01-13', // 成人の日
      '2025-02-11', // 建国記念の日
      '2025-02-23', // 天皇誕生日
      '2025-03-20', // 春分の日
      '2025-04-29', // 昭和の日
      '2025-05-03', // 憲法記念日
      '2025-05-04', // みどりの日
      '2025-05-05', // こどもの日
      '2025-07-21', // 海の日
      '2025-08-11', // 山の日
      '2025-09-15', // 敬老の日
      '2025-09-23', // 秋分の日
      '2025-10-13', // スポーツの日
      '2025-11-03', // 文化の日
      '2025-11-23', // 勤労感謝の日
      '2025-12-23', // 天皇誕生日振替
    ]
    
    const dateString = date.toISOString().split('T')[0]
    return !holidays2025.includes(dateString)
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
    // 「【新品】」「【新品仕上げ中古】」「【中古A】」「【中古B】」「【中古C】」で始まり、「K18」「K24」または「Pt」を含む商品
    const startsWithTarget = productName.startsWith('【新品】') || 
                            productName.startsWith('【新品仕上げ中古】') ||
                            productName.startsWith('【中古A】') ||
                            productName.startsWith('【中古B】') ||
                            productName.startsWith('【中古C】')
    const containsK18 = productName.includes('K18')
    const containsK24 = productName.includes('K24')
    const containsPt = productName.includes('Pt')
    
    return startsWithTarget && (containsK18 || containsK24 || containsPt)
  }

  /**
   * 商品の金属種別を判定
   */
  getMetalType(productName: string): 'gold' | 'platinum' | null {
    if (!this.shouldUpdateProduct(productName)) return null
    
    if (productName.includes('Pt')) return 'platinum'
    if (productName.includes('K18')) return 'gold'
    if (productName.includes('K24')) return 'gold'
    
    return null
  }

  /**
   * Amazon・Yahoo!ショップへの価格同期（標準の商品情報送信API使用）
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

      // 各プラットフォームに商品情報送信を実行
      const syncResults: {
        amazon: any,
        yahoo: any,
        rakuten: any
      } = {
        amazon: null,
        yahoo: null,
        rakuten: null
      }

      try {
        // Amazon商品情報送信
        console.log('📦 Amazon商品情報送信...')
        syncResults.amazon = await this.nextEngineClient.callApi('/api_v1_mall_amazon/bulkupsert', {
          data_type: 'json',
          data: JSON.stringify({
            goods_list: updatedProducts.map(p => ({
              goods_id: p.goodsId,
              selling_price: p.newPrice
            }))
          })
        })
      } catch (amazonError) {
        console.warn('⚠️ Amazon同期エラー:', amazonError)
      }

      try {
        // Yahoo!ショッピング商品情報送信  
        console.log('🛒 Yahoo!ショッピング商品情報送信...')
        syncResults.yahoo = await this.nextEngineClient.callApi('/api_v1_mall_yahoo/bulkupsert', {
          data_type: 'json',
          data: JSON.stringify({
            goods_list: updatedProducts.map(p => ({
              goods_id: p.goodsId,
              selling_price: p.newPrice
            }))
          })
        })
      } catch (yahooError) {
        console.warn('⚠️ Yahoo!同期エラー:', yahooError)
      }

      try {
        // 楽天市場商品情報送信
        console.log('🛍️ 楽天市場商品情報送信...')
        syncResults.rakuten = await this.nextEngineClient.callApi('/api_v1_mall_rakuten/bulkupsert', {
          data_type: 'json', 
          data: JSON.stringify({
            goods_list: updatedProducts.map(p => ({
              goods_id: p.goodsId,
              selling_price: p.newPrice
            }))
          })
        })
      } catch (rakutenError) {
        console.warn('⚠️ 楽天同期エラー:', rakutenError)
      }

      // 結果判定
      const successCount = Object.values(syncResults).filter(r => r?.result === 'success').length
      
      if (successCount > 0) {
        console.log(`✅ 外部プラットフォーム価格同期完了 (${successCount}/3プラットフォーム成功)`)
        
        // 同期ログをDBに保存
        await this.savePlatformSyncLog({
          syncedAt: new Date(),
          productCount: updatedProducts.length,
          status: 'success',
          details: syncResults
        })

        return {
          success: true,
          message: `${updatedProducts.length}商品の外部プラットフォーム価格同期完了 (${successCount}/3成功)`,
          details: syncResults
        }
      } else {
        throw new Error('全プラットフォームの同期に失敗しました')
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

      return {
        lastSync,
        recentSyncs
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