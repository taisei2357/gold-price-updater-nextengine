// NextEngine API型定義

export interface NextEngineApiResponse {
  result: 'success' | 'error'
  code?: string
  message?: string
  data?: any
  count?: number
  access_token?: string
  refresh_token?: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface NextEngineProduct {
  goods_id: string
  goods_name: string
  goods_selling_price: string
  goods_cost_price?: string
  stock_quantity?: string
}

export interface PriceUpdateResult {
  productId: string
  productName: string
  oldPrice: number
  newPrice: number
  metalType?: 'gold' | 'platinum'
  success: boolean
  error?: string
}

export interface PriceHistoryData {
  date: string
  goldPrice: number
  platinumPrice?: number
}

export interface ExecutionResult {
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED'
  updatedProducts: number
  goldRatio?: number
  platinumRatio?: number
  executionReason: string
  errorMessage?: string
  skippedReason?: string
  durationSeconds?: number
}