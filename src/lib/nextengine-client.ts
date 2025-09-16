import { db } from './db'
import type { NextEngineApiResponse, TokenPair } from '@/types/nextengine'

export class NextEngineClient {
  private baseUrl = 'https://api.next-engine.org'
  private oauthUrl = 'https://base.next-engine.org'

  /**
   * トークンをDBから取得
   */
  private async getTokens(): Promise<TokenPair | null> {
    const tokenRow = await db.nextEngineToken.findUnique({
      where: { id: 1 }
    })

    return tokenRow 
      ? { accessToken: tokenRow.accessToken, refreshToken: tokenRow.refreshToken }
      : null
  }

  /**
   * トークンをDBに保存
   */
  private async saveTokens(tokens: TokenPair): Promise<void> {
    await db.nextEngineToken.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    })
  }

  /**
   * refresh_tokenを使ってaccess_tokenを更新
   */
  private async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    const response = await fetch(`${this.oauthUrl}/apps/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.NE_CLIENT_ID!,
        client_secret: process.env.NE_CLIENT_SECRET!
      })
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`)
    }

    const result = await response.json()
    
    if (!result.access_token || !result.refresh_token) {
      throw new Error('Invalid token response')
    }

    const newTokens = {
      accessToken: result.access_token,
      refreshToken: result.refresh_token
    }

    await this.saveTokens(newTokens)
    return newTokens
  }

  /**
   * NextEngine APIを呼び出し（自動トークン更新付き）
   */
  async callApi(
    endpoint: string, 
    params: Record<string, any> = {},
    retries = 2
  ): Promise<NextEngineApiResponse> {
    const tokens = await this.getTokens()
    if (!tokens) {
      throw new Error('No tokens found. Please authenticate first.')
    }

    for (let attempt = 0; attempt < retries; attempt++) {
      const currentTokens = attempt === 0 ? tokens : await this.getTokens()
      if (!currentTokens) throw new Error('Failed to get tokens')

      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            access_token: currentTokens.accessToken,
            refresh_token: currentTokens.refreshToken,
            ...Object.fromEntries(
              Object.entries(params).map(([k, v]) => [k, String(v)])
            )
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const result: NextEngineApiResponse = await response.json()

        // 新しいトークンがあれば保存（ローリング更新）
        if (result.access_token && result.refresh_token) {
          await this.saveTokens({
            accessToken: result.access_token,
            refreshToken: result.refresh_token
          })
        }

        // access_token期限切れエラーの場合
        if (result.code === '002004' && attempt < retries - 1) {
          console.log('Access token expired, refreshing...')
          await this.refreshAccessToken(currentTokens.refreshToken)
          continue // 再試行
        }

        return result

      } catch (error) {
        console.error(`API call attempt ${attempt + 1} failed:`, error)
        if (attempt === retries - 1) throw error
      }
    }

    throw new Error('All API call attempts failed')
  }

  /**
   * 軽いAPI呼び出し（キープアライブ用）
   */
  async keepAlive(): Promise<{ success: boolean; refreshed: boolean; message: string }> {
    try {
      const result = await this.callApi('/api_v1_login_user/info')
      
      if (result.result === 'success') {
        return { 
          success: true, 
          refreshed: false, 
          message: 'Token is healthy' 
        }
      } else {
        throw new Error(result.message || 'Unknown error')
      }
    } catch (error) {
      console.error('Keep alive failed:', error)
      return { 
        success: false, 
        refreshed: false, 
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 商品情報を取得
   */
  async getProducts(limit = 200, offset = 0): Promise<NextEngineApiResponse> {
    return this.callApi('/api_v1_master_goods/search', {
      fields: 'goods_id,goods_name,goods_selling_price,goods_cost_price,stock_quantity',
      limit,
      offset
    })
  }

  /**
   * 商品価格を更新
   */
  async updateProductPrice(goodsId: string, price: number): Promise<NextEngineApiResponse> {
    const csvData = `syohin_code,baika_tnk\n${goodsId},${price}`
    
    return this.callApi('/api_v1_master_goods/upload', {
      data_type: 'csv',
      data: csvData
    })
  }
}