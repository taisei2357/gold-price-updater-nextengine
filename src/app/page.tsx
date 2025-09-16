import Link from 'next/link'
import { db } from '@/lib/db'

async function getSystemStatus() {
  try {
    console.log('🔍 Getting system status...')

    // 最新のキープアライブログ
    let latestKeepAlive = null
    try {
      latestKeepAlive = await db.keepAliveLog.findFirst({
        orderBy: { createdAt: 'desc' }
      })
    } catch (keepAliveError) {
      console.error('KeepAlive query failed:', keepAliveError)
    }

    // 最新の実行ログ
    let latestExecution = null
    try {
      latestExecution = await db.executionLog.findFirst({
        orderBy: { createdAt: 'desc' }
      })
    } catch (executionError) {
      console.error('Execution query failed:', executionError)
    }

    // トークンの存在確認
    let tokenExists = null
    try {
      tokenExists = await db.nextEngineToken.findFirst({
        where: { id: 1 }
      })
      console.log('Token query result:', !!tokenExists)
    } catch (tokenError) {
      console.error('Token query failed:', tokenError)
    }

    // 最新の価格履歴
    let latestPrice = null
    try {
      latestPrice = await db.priceHistory.findFirst({
        orderBy: { date: 'desc' }
      })
    } catch (priceError) {
      console.error('Price query failed:', priceError)
    }

    return {
      keepAlive: latestKeepAlive,
      execution: latestExecution,
      hasToken: !!tokenExists,
      latestPrice,
      debug: {
        tokenFound: !!tokenExists,
        tokenId: tokenExists?.id
      }
    }
  } catch (error) {
    console.error('System status failed:', error)
    return {
      keepAlive: null,
      execution: null,
      hasToken: false,
      latestPrice: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export default async function HomePage() {
  const status = await getSystemStatus()

  return (
    <main className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">NextEngine 価格更新システム</h1>
      
      {/* システム状態 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">認証状態</h3>
          <div className={`text-2xl font-bold ${status?.hasToken ? 'text-green-600' : 'text-red-600'}`}>
            {status?.hasToken ? '✅ 認証済み' : '❌ 未認証'}
          </div>
          <div className="mt-2 space-y-2">
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
              <p className="text-red-800 text-sm font-semibold">⚠️ 重要: すべてのトークンが期限切れです</p>
              <p className="text-red-700 text-sm">NextEngineの開発者コンソールで新しいトークンを取得してください</p>
            </div>
            <Link 
              href="/api/nextengine/auth"
              className="block w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-center font-semibold"
            >
              🚨 NextEngine再認証が必要
            </Link>
            <div className="text-xs text-gray-600 mt-2 space-y-1">
              <p>手順:</p>
              <p>1. 上のボタンをクリックしてNextEngine認証開始</p>
              <p>2. NextEngineにログインして認証を完了</p>
              <p>3. システムが自動的にトークンを保存</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">キープアライブ</h3>
          <div className={`text-lg font-bold ${
            status?.keepAlive?.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'
          }`}>
            {status?.keepAlive?.status || '未実行'}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {status?.keepAlive?.createdAt 
              ? new Date(status.keepAlive.createdAt).toLocaleString('ja-JP')
              : '---'
            }
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">最新実行</h3>
          <div className={`text-lg font-bold ${
            status?.execution?.status === 'SUCCESS' ? 'text-green-600' : 
            status?.execution?.status === 'FAILED' ? 'text-red-600' : 'text-yellow-600'
          }`}>
            {status?.execution?.status || '未実行'}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {status?.execution?.date 
              ? new Date(status.execution.date).toLocaleDateString('ja-JP')
              : '---'
            }
          </div>
          {status?.execution?.updatedProducts !== undefined && (
            <div className="text-sm text-gray-600">
              更新: {status.execution.updatedProducts}件
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">最新価格</h3>
          <div className="text-lg font-bold text-blue-600">
            {status?.latestPrice?.goldPrice 
              ? `${status.latestPrice.goldPrice.toLocaleString()}円/g`
              : '未取得'
            }
          </div>
          <div className="text-sm text-gray-600 mt-1">
            金価格 ({status?.latestPrice?.date 
              ? new Date(status.latestPrice.date).toLocaleDateString('ja-JP')
              : '---'
            })
          </div>
        </div>
      </div>

      {/* 機能メニュー */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">システム操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Link 
            href="/api/nextengine/keepalive"
            className="bg-blue-600 text-white px-6 py-3 rounded text-center hover:bg-blue-700 block"
          >
            手動キープアライブ実行
          </Link>
          <Link 
            href="/api/nextengine/price-update"
            className="bg-green-600 text-white px-6 py-3 rounded text-center hover:bg-green-700 block"
          >
            手動価格更新実行
          </Link>
          <Link 
            href="/api/nextengine/callback?health=1"
            className="bg-gray-600 text-white px-6 py-3 rounded text-center hover:bg-gray-700 block"
          >
            システムヘルスチェック
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link 
            href="/api/debug/db-status"
            className="bg-orange-600 text-white px-6 py-3 rounded text-center hover:bg-orange-700 block"
          >
            データベース状態確認
          </Link>
          <form action="/api/debug/refresh-token" method="POST">
            <button 
              type="submit"
              className="w-full bg-red-600 text-white px-6 py-3 rounded hover:bg-red-700"
            >
              手動トークンリフレッシュ
            </button>
          </form>
        </div>
      </div>

      {/* 実行ログ */}
      {status?.execution && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">最新実行ログ</h2>
          <div className="space-y-2">
            <div><span className="font-semibold">状態:</span> {status.execution.status}</div>
            <div><span className="font-semibold">更新商品数:</span> {status.execution.updatedProducts}件</div>
            {status.execution.goldRatio && (
              <div><span className="font-semibold">金価格変動率:</span> {(status.execution.goldRatio * 100).toFixed(4)}%</div>
            )}
            {status.execution.durationSeconds && (
              <div><span className="font-semibold">実行時間:</span> {status.execution.durationSeconds.toFixed(2)}秒</div>
            )}
            {status.execution.errorMessage && (
              <div className="text-red-600"><span className="font-semibold">エラー:</span> {status.execution.errorMessage}</div>
            )}
            {status.execution.skippedReason && (
              <div className="text-yellow-600"><span className="font-semibold">スキップ理由:</span> {status.execution.skippedReason}</div>
            )}
          </div>
        </div>
      )}

      {/* システム情報 */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>NextEngine価格更新システム v1.0</p>
        <p>キープアライブ: 12時間ごと | 価格更新: 平日10:00 JST</p>
      </div>
    </main>
  )
}