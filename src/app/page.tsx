import Link from 'next/link'
import { db } from '@/lib/db'

async function getSystemStatus() {
  try {
    // 最新のキープアライブログ
    const latestKeepAlive = await db.keepAliveLog.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    // 最新の実行ログ
    const latestExecution = await db.executionLog.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    // トークンの存在確認
    const tokenExists = await db.nextEngineToken.findUnique({
      where: { id: 1 }
    })

    // 最新の価格履歴
    const latestPrice = await db.priceHistory.findFirst({
      orderBy: { date: 'desc' }
    })

    return {
      keepAlive: latestKeepAlive,
      execution: latestExecution,
      hasToken: !!tokenExists,
      latestPrice
    }
  } catch (error) {
    return null
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
          {!status?.hasToken && (
            <div className="mt-2 space-y-2">
              <button 
                onClick="setupInitialTokens()"
                className="block w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
              >
                既存トークンをセットアップ
              </button>
              <Link 
                href="/api/nextengine/auth"
                className="block w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-center text-sm"
              >
                新規認証開始
              </Link>
            </div>
          )}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* JavaScript */}
      <script dangerouslySetInnerHTML={{
        __html: `
          async function setupInitialTokens() {
            try {
              const response = await fetch('/api/nextengine/setup-tokens', {
                method: 'POST',
                headers: {
                  'Authorization': 'Bearer ${process.env.CRON_SECRET || 'nextengine_secret_2024'}',
                  'Content-Type': 'application/json'
                }
              });
              const result = await response.json();
              if (result.success) {
                alert('✅ 既存トークンのセットアップが完了しました！\\nページを再読み込みします。');
                window.location.reload();
              } else {
                alert('❌ セットアップ失敗: ' + result.message);
              }
            } catch (error) {
              alert('❌ エラー: ' + error.message);
            }
          }
        `
      }} />
    </main>
  )
}