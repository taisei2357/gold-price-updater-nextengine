import { NextRequest } from 'next/server'

/**
 * シンプルなSendGridテスト用エンドポイント
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.SENDGRID_API_KEY
    const fromEmail = 't.takei@irisht.jp'
    const toEmail = 'taisei19971021@gmail.com'

    if (!apiKey) {
      return Response.json({
        success: false,
        error: 'SENDGRID_API_KEY not configured',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    console.log('🧪 Testing SendGrid email...')

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: toEmail }],
            subject: '🧪 NextEngine監視システム テスト'
          }
        ],
        from: {
          email: fromEmail,
          name: 'NextEngine監視システム'
        },
        content: [
          {
            type: 'text/plain',
            value: `NextEngine監視システムのメール通知機能テストです。

テスト実行時刻: ${new Date().toLocaleString('ja-JP')}

このメールが届いていれば、監視システムのメール通知が正常に動作しています。

今後、以下の場合に自動的にメール通知が送信されます：
- トークン期限切れ警告
- Keepalive失敗通知
- システム復旧通知
- 価格更新完了通知
- 週次ヘルスレポート

NextEngine価格更新システム
https://gold-price-updater-nextengine.vercel.app`
          },
          {
            type: 'text/html',
            value: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4f46e5;">🧪 NextEngine監視システム テスト</h2>

                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p>NextEngine監視システムのメール通知機能テストです。</p>
                  <p><strong>テスト実行時刻:</strong> ${new Date().toLocaleString('ja-JP')}</p>
                </div>

                <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <h3 style="color: #374151; margin-top: 0;">このメールが届いていれば監視システムは正常です ✅</h3>

                  <h4>今後、以下の場合に自動通知が送信されます：</h4>
                  <ul>
                    <li>🚨 トークン期限切れ警告</li>
                    <li>⚠️ Keepalive失敗通知</li>
                    <li>✅ システム復旧通知</li>
                    <li>💰 価格更新完了通知</li>
                    <li>📊 週次ヘルスレポート</li>
                  </ul>
                </div>

                <div style="text-align: center; margin: 24px 0;">
                  <a href="https://gold-price-updater-nextengine.vercel.app/admin"
                     style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    📊 管理画面を確認
                  </a>
                </div>

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                <p style="color: #6b7280; font-size: 12px; text-align: center;">
                  NextEngine価格更新システム - 監視テスト
                </p>
              </div>
            `
          }
        ]
      })
    })

    const success = response.status === 202
    const statusText = response.statusText
    const responseText = await response.text()

    console.log(`📧 SendGrid test result: ${success ? 'Success' : 'Failed'}`)
    console.log(`Response: ${response.status} ${statusText}`)

    return Response.json({
      success,
      status: response.status,
      statusText,
      responseText: responseText || 'No response body',
      message: success
        ? 'テストメールを送信しました。taisei19971021@gmail.comを確認してください。'
        : 'メール送信に失敗しました。',
      timestamp: new Date().toISOString(),
      config: {
        fromEmail,
        toEmail,
        hasApiKey: !!apiKey
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ SendGrid test failed:', errorMessage)

    return Response.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
