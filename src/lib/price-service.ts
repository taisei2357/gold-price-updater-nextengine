import { db } from './db'
import type { PriceHistoryData } from '@/types/nextengine'

export class PriceService {
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
}