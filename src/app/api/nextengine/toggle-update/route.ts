import { NextRequest } from 'next/server'

/**
 * NextEngine 価格更新の停止/再開制御
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, secret } = body

    // 認証チェック（環境変数のシークレットと照合）
    const expectedSecret = process.env.TOGGLE_SECRET || 'default-secret'
    if (secret !== expectedSecret) {
      return Response.json({ 
        error: 'Unauthorized: Invalid secret' 
      }, { status: 401 })
    }

    // 現在の状態を確認
    const currentStatus = process.env.PRICE_UPDATE_ENABLED !== 'false'

    if (action === 'status') {
      return Response.json({
        success: true,
        enabled: currentStatus,
        message: `価格更新は現在${currentStatus ? '有効' : '停止中'}です`,
        timestamp: new Date().toISOString()
      })
    }

    let newStatus: boolean
    let message: string

    switch (action) {
      case 'start':
        newStatus = true
        message = '価格更新を再開しました'
        break
      case 'stop':
        newStatus = false
        message = '価格更新を停止しました'
        break
      default:
        return Response.json({ 
          error: 'Invalid action. Use: start, stop, or status' 
        }, { status: 400 })
    }

    // 注意: Next.js/Vercelでは実行時に環境変数を変更できないため、
    // 実際の停止/再開はVercelの環境変数設定で行う必要があります
    console.log(`📝 ${message} (PRICE_UPDATE_ENABLED=${newStatus})`)

    return Response.json({
      success: true,
      action,
      enabled: newStatus,
      message,
      note: 'Vercelの環境変数PRICE_UPDATE_ENABLEDを手動で設定してください',
      instructions: {
        stop: 'Vercel Dashboard > Environment Variables > PRICE_UPDATE_ENABLED = false',
        start: 'Vercel Dashboard > Environment Variables > PRICE_UPDATE_ENABLED = true (または削除)'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Toggle update error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * 現在の状態を取得
 */
export async function GET() {
  const enabled = process.env.PRICE_UPDATE_ENABLED !== 'false'
  
  return Response.json({
    success: true,
    enabled,
    message: `NextEngine価格更新は現在${enabled ? '有効' : '停止中'}です`,
    timestamp: new Date().toISOString(),
    environment: {
      PRICE_UPDATE_ENABLED: process.env.PRICE_UPDATE_ENABLED || 'undefined (default: true)'
    }
  })
}