'use client'

import { useState, useEffect } from 'react'

interface UpdateStatus {
  success: boolean
  enabled: boolean
  message: string
  timestamp: string
  environment?: Record<string, string>
}

export default function AdminPage() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [secret, setSecret] = useState('')

  // 初期状態を取得
  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/nextengine/toggle-update')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Status fetch error:', error)
    }
  }

  const toggleUpdate = async (action: 'start' | 'stop') => {
    if (!secret) {
      alert('シークレットキーを入力してください')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/nextengine/toggle-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, secret })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(data.message)
        await fetchStatus() // 状態を更新
      } else {
        alert(`エラー: ${data.error}`)
      }
    } catch (error) {
      alert(`エラー: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <h1 style={{ color: '#1f2937', marginBottom: '2rem' }}>
        🎛️ NextEngine 価格更新管理
      </h1>

      {/* 現在の状態 */}
      {status && (
        <div style={{
          background: status.enabled ? '#dcfce7' : '#fef2f2',
          border: `1px solid ${status.enabled ? '#16a34a' : '#dc2626'}`,
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ 
            margin: '0 0 0.5rem 0',
            color: status.enabled ? '#15803d' : '#dc2626'
          }}>
            {status.enabled ? '🟢 価格更新: 有効' : '🔴 価格更新: 停止中'}
          </h2>
          <p style={{ margin: '0.5rem 0' }}>
            {status.message}
          </p>
          <p style={{ 
            fontSize: '0.875rem', 
            color: '#6b7280',
            margin: '0.5rem 0 0 0' 
          }}>
            最終確認: {new Date(status.timestamp).toLocaleString('ja-JP')}
          </p>
        </div>
      )}

      {/* 環境変数表示 */}
      {status?.environment && (
        <div style={{
          background: '#f3f4f6',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>環境変数</h3>
          {Object.entries(status.environment).map(([key, value]) => (
            <div key={key} style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
              <strong>{key}:</strong> {value}
            </div>
          ))}
        </div>
      )}

      {/* 制御パネル */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        padding: '1.5rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>制御パネル</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="secret" style={{ 
            display: 'block', 
            marginBottom: '0.5rem',
            fontWeight: '500'
          }}>
            シークレットキー:
          </label>
          <input
            id="secret"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="シークレットキーを入力"
            style={{
              width: '100%',
              maxWidth: '300px',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <button
            onClick={() => toggleUpdate('stop')}
            disabled={loading || !status?.enabled}
            style={{
              background: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: loading || !status?.enabled ? 'not-allowed' : 'pointer',
              opacity: loading || !status?.enabled ? 0.5 : 1
            }}
          >
            {loading ? '処理中...' : '⏸️ 停止'}
          </button>

          <button
            onClick={() => toggleUpdate('start')}
            disabled={loading || status?.enabled}
            style={{
              background: '#16a34a',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: loading || status?.enabled ? 'not-allowed' : 'pointer',
              opacity: loading || status?.enabled ? 0.5 : 1
            }}
          >
            {loading ? '処理中...' : '▶️ 再開'}
          </button>

          <button
            onClick={fetchStatus}
            disabled={loading}
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            🔄 状態更新
          </button>
        </div>

        <div style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '4px',
          padding: '1rem',
          fontSize: '0.875rem'
        }}>
          <strong>⚠️ 重要:</strong> 実際の停止/再開は<strong>Vercelの環境変数設定</strong>で行う必要があります。
          <br />
          <strong>停止:</strong> Vercel Dashboard → Environment Variables → <code>PRICE_UPDATE_ENABLED = false</code>
          <br />
          <strong>再開:</strong> Vercel Dashboard → Environment Variables → <code>PRICE_UPDATE_ENABLED = true</code> (または削除)
        </div>
      </div>

      {/* スケジュール情報 */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '1.5rem',
        marginTop: '2rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>📅 実行スケジュール</h3>
        <div style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>
          <div><strong>時刻:</strong> JST 10:00 (UTC 01:00)</div>
          <div><strong>曜日:</strong> 月曜日〜金曜日（平日のみ）</div>
          <div><strong>祝日:</strong> 自動的にスキップ</div>
          <div><strong>Cron式:</strong> <code>0 1 * * 1-5</code></div>
        </div>
      </div>
    </div>
  )
}