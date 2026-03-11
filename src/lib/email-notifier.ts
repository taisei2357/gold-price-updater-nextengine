/**
 * SendGrid メール通知システム
 * トークン期限切れやシステム異常時の通知
 */

interface EmailNotification {
  to: string
  subject: string
  htmlContent: string
  textContent: string
}

export class EmailNotifier {
  private apiKey: string
  private fromEmail: string
  private toEmail: string

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || 'zBFj6UpNQ4-HmWFan9uq7g'
    this.fromEmail = (process.env.NOTIFICATION_FROM_EMAIL || 'system@nextengine-updater.com').trim()
    this.toEmail = (process.env.NOTIFICATION_TO_EMAIL || 'taisei19971021@gmail.com').trim()

    if (!this.apiKey) {
      console.warn('⚠️ SendGrid API key not configured')
    }
  }

  /**
   * SendGrid APIでメール送信
   */
  private async sendEmail(notification: EmailNotification): Promise<boolean> {
    if (!this.apiKey) {
      console.error('❌ SendGrid API key not configured')
      return false
    }

    try {
      // メールアドレスをパース（カンマ区切り対応、改行除去）
      const emailAddresses = notification.to
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0 && email.includes('@'))

      if (emailAddresses.length === 0) {
        console.error('❌ No valid email addresses found:', notification.to)
        return false
      }

      console.log(`📧 Sending email to: ${emailAddresses.join(', ')}`)

      const requestBody = {
        personalizations: [
          {
            to: emailAddresses.map(email => ({ email })),
            subject: notification.subject
          }
        ],
        from: { email: this.fromEmail, name: 'NextEngine監視システム' },
        content: [
          {
            type: 'text/plain',
            value: notification.textContent
          },
          {
            type: 'text/html',
            value: notification.htmlContent
          }
        ]
      }

      console.log('📤 SendGrid request:', JSON.stringify({
        to: emailAddresses,
        from: this.fromEmail,
        subject: notification.subject
      }))

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const responseText = await response.text()

      if (response.status === 202) {
        console.log('✅ Email notification sent successfully')
        return true
      } else {
        console.error('❌ SendGrid API error:', response.status, responseText)
        return false
      }

    } catch (error) {
      console.error('❌ Email sending failed:', error)
      return false
    }
  }

  /**
   * トークン期限切れ警告
   */
  async sendTokenExpirationWarning(): Promise<boolean> {
    const subject = '🚨 NextEngine トークン期限切れ警告'
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">🚨 NextEngine トークン期限切れ</h2>
        
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #991b1b; margin-top: 0;">システム状態</h3>
          <p><strong>状態:</strong> トークンが期限切れです</p>
          <p><strong>影響:</strong> 価格更新が停止しています</p>
          <p><strong>検出時刻:</strong> ${new Date().toLocaleString('ja-JP')}</p>
        </div>

        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #374151; margin-top: 0;">対応方法</h3>
          <ol style="color: #374151;">
            <li>管理画面にアクセス: <a href="https://gold-price-updater-nextengine.vercel.app/admin" style="color: #2563eb;">https://gold-price-updater-nextengine.vercel.app/admin</a></li>
            <li>「NextEngine再認証」ボタンをクリック</li>
            <li>NextEngineでログインして認証を完了</li>
          </ol>
          
          <p style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; padding: 8px; font-size: 14px;">
            <strong>⚠️ 注意:</strong> 72時間以内に再認証を行わないと、手動での認証設定が必要になります。
          </p>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="https://gold-price-updater-nextengine.vercel.app/api/nextengine/auth" 
             style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            🔐 今すぐ再認証する
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #6b7280; font-size: 12px; text-align: center;">
          このメールはNextEngine価格更新システムから自動送信されています。
        </p>
      </div>
    `

    const textContent = `
NextEngine トークン期限切れ警告

システム状態: トークンが期限切れです
影響: 価格更新が停止しています  
検出時刻: ${new Date().toLocaleString('ja-JP')}

対応方法:
1. 管理画面にアクセス: https://gold-price-updater-nextengine.vercel.app/admin
2. 「NextEngine再認証」ボタンをクリック
3. NextEngineでログインして認証を完了

再認証URL: https://gold-price-updater-nextengine.vercel.app/api/nextengine/auth

※ 72時間以内に再認証を行わないと、手動での認証設定が必要になります。
    `

    return await this.sendEmail({
      to: this.toEmail,
      subject,
      htmlContent,
      textContent
    })
  }

  /**
   * Keepalive失敗通知
   */
  async sendKeepAliveFailure(errorMessage: string, consecutiveFailures: number = 1): Promise<boolean> {
    const isUrgent = consecutiveFailures >= 3
    const subject = `${isUrgent ? '🚨' : '⚠️'} NextEngine Keepalive失敗 ${consecutiveFailures > 1 ? `(${consecutiveFailures}回連続)` : ''}`
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isUrgent ? '#dc2626' : '#f59e0b'};">${isUrgent ? '🚨' : '⚠️'} NextEngine Keepalive失敗</h2>
        
        <div style="background: ${isUrgent ? '#fef2f2' : '#fef3c7'}; border: 1px solid ${isUrgent ? '#fecaca' : '#fde68a'}; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: ${isUrgent ? '#991b1b' : '#92400e'}; margin-top: 0;">エラー詳細</h3>
          <p><strong>エラーメッセージ:</strong> ${errorMessage}</p>
          <p><strong>連続失敗回数:</strong> ${consecutiveFailures}回</p>
          <p><strong>検出時刻:</strong> ${new Date().toLocaleString('ja-JP')}</p>
          ${isUrgent ? '<p><strong>緊急度:</strong> <span style="color: #dc2626;">高 - 即座の対応が必要</span></p>' : ''}
        </div>

        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #374151; margin-top: 0;">推奨対応</h3>
          <ul style="color: #374151;">
            <li>管理画面で詳細状況を確認</li>
            <li>必要に応じて手動でkeepalive実行</li>
            ${isUrgent ? '<li><strong style="color: #dc2626;">トークンの再認証を検討</strong></li>' : ''}
          </ul>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="https://gold-price-updater-nextengine.vercel.app/admin" 
             style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 8px;">
            📊 管理画面を確認
          </a>
          <a href="https://gold-price-updater-nextengine.vercel.app/api/nextengine/keepalive" 
             style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            🔄 手動Keepalive実行
          </a>
        </div>
      </div>
    `

    const textContent = `
NextEngine Keepalive失敗通知

エラーメッセージ: ${errorMessage}
連続失敗回数: ${consecutiveFailures}回
検出時刻: ${new Date().toLocaleString('ja-JP')}
${isUrgent ? '緊急度: 高 - 即座の対応が必要' : ''}

推奨対応:
- 管理画面で詳細状況を確認
- 必要に応じて手動でkeepalive実行
${isUrgent ? '- トークンの再認証を検討' : ''}

管理画面: https://gold-price-updater-nextengine.vercel.app/admin
手動Keepalive: https://gold-price-updater-nextengine.vercel.app/api/nextengine/keepalive
    `

    return await this.sendEmail({
      to: this.toEmail,
      subject,
      htmlContent,
      textContent
    })
  }

  /**
   * システム復旧通知
   */
  async sendSystemRecovery(): Promise<boolean> {
    const subject = '✅ NextEngine システム復旧完了'
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">✅ NextEngine システム復旧完了</h2>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #15803d; margin-top: 0;">復旧状況</h3>
          <p><strong>状態:</strong> 正常動作中</p>
          <p><strong>トークン:</strong> 有効</p>
          <p><strong>復旧時刻:</strong> ${new Date().toLocaleString('ja-JP')}</p>
        </div>

        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #374151; margin-top: 0;">システム状況</h3>
          <p>✅ トークン認証: 正常</p>
          <p>✅ Keepalive: 正常</p>
          <p>✅ 価格更新: 準備完了</p>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="https://gold-price-updater-nextengine.vercel.app/admin" 
             style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            📊 管理画面を確認
          </a>
        </div>
      </div>
    `

    const textContent = `
NextEngine システム復旧完了

状態: 正常動作中
トークン: 有効
復旧時刻: ${new Date().toLocaleString('ja-JP')}

システム状況:
✅ トークン認証: 正常
✅ Keepalive: 正常  
✅ 価格更新: 準備完了

管理画面: https://gold-price-updater-nextengine.vercel.app/admin
    `

    return await this.sendEmail({
      to: this.toEmail,
      subject,
      htmlContent,
      textContent
    })
  }

  /**
   * KeepAlive成功通知（毎日）
   */
  async sendKeepAliveSuccess(refreshed: boolean = false): Promise<boolean> {
    const subject = '✅ NextEngine KeepAlive 正常実行'

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">✅ NextEngine KeepAlive 正常実行</h2>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #15803d; margin-top: 0;">実行結果</h3>
          <p><strong>実行時刻:</strong> ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
          <p><strong>ステータス:</strong> 正常</p>
          <p><strong>トークン:</strong> ${refreshed ? '更新されました' : '有効期限内'}</p>
        </div>

        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #374151; margin-top: 0;">システム状況</h3>
          <p>✅ トークン認証: 正常</p>
          <p>✅ NextEngine API: 接続正常</p>
          <p>✅ 次回実行: 明日 12:00 JST</p>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="https://gold-price-updater-nextengine.vercel.app"
             style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            📊 管理画面を確認
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #6b7280; font-size: 12px; text-align: center;">
          このメールはNextEngine KeepAliveシステムから毎日12:00 JSTに自動送信されています。
        </p>
      </div>
    `

    const textContent = `
NextEngine KeepAlive 正常実行

実行時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
ステータス: 正常
トークン: ${refreshed ? '更新されました' : '有効期限内'}

システム状況:
✅ トークン認証: 正常
✅ NextEngine API: 接続正常
✅ 次回実行: 明日 12:00 JST

管理画面: https://gold-price-updater-nextengine.vercel.app

このメールはNextEngine KeepAliveシステムから毎日12:00 JSTに自動送信されています。
    `

    return await this.sendEmail({
      to: this.toEmail,
      subject,
      htmlContent,
      textContent
    })
  }

  /**
   * 価格更新完了通知
   */
  async sendPriceUpdateSuccess(result: {
    updatedProducts: number
    failedProducts: number
    goldRatio: number
    platinumRatio: number
    duration: number
  }): Promise<boolean> {
    const subject = `✅ NextEngine 価格更新完了 (${result.updatedProducts}件更新)`

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">✅ NextEngine 価格更新完了</h2>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #15803d; margin-top: 0;">更新結果</h3>
          <p><strong>実行時刻:</strong> ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
          <p><strong>更新商品数:</strong> <span style="color: #16a34a; font-size: 18px;">${result.updatedProducts}件</span></p>
          ${result.failedProducts > 0 ? `<p><strong>失敗:</strong> <span style="color: #dc2626;">${result.failedProducts}件</span></p>` : ''}
          <p><strong>処理時間:</strong> ${result.duration.toFixed(2)}秒</p>
        </div>

        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #374151; margin-top: 0;">価格変動率</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>🥇 金:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: ${result.goldRatio >= 0 ? '#16a34a' : '#dc2626'};">
                ${result.goldRatio >= 0 ? '+' : ''}${(result.goldRatio * 100).toFixed(4)}%
              </td>
            </tr>
            <tr>
              <td style="padding: 8px;"><strong>🥈 プラチナ:</strong></td>
              <td style="padding: 8px; text-align: right; color: ${result.platinumRatio >= 0 ? '#16a34a' : '#dc2626'};">
                ${result.platinumRatio >= 0 ? '+' : ''}${(result.platinumRatio * 100).toFixed(4)}%
              </td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="https://gold-price-updater-nextengine.vercel.app/admin"
             style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            📊 管理画面で詳細を確認
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #6b7280; font-size: 12px; text-align: center;">
          このメールはNextEngine価格更新システムから平日1:00 JSTに自動送信されています。
        </p>
      </div>
    `

    const textContent = `
NextEngine 価格更新完了

実行時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
更新商品数: ${result.updatedProducts}件
${result.failedProducts > 0 ? `失敗: ${result.failedProducts}件` : ''}
処理時間: ${result.duration.toFixed(2)}秒

価格変動率:
🥇 金: ${result.goldRatio >= 0 ? '+' : ''}${(result.goldRatio * 100).toFixed(4)}%
🥈 プラチナ: ${result.platinumRatio >= 0 ? '+' : ''}${(result.platinumRatio * 100).toFixed(4)}%

管理画面: https://gold-price-updater-nextengine.vercel.app/admin

このメールはNextEngine価格更新システムから平日1:00 JSTに自動送信されています。
    `

    return await this.sendEmail({
      to: this.toEmail,
      subject,
      htmlContent,
      textContent
    })
  }

  /**
   * 価格更新失敗通知
   */
  async sendPriceUpdateFailure(errorMessage: string): Promise<boolean> {
    const subject = '🚨 NextEngine 価格更新失敗'

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">🚨 NextEngine 価格更新失敗</h2>

        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #991b1b; margin-top: 0;">エラー詳細</h3>
          <p><strong>エラーメッセージ:</strong> ${errorMessage}</p>
          <p><strong>検出時刻:</strong> ${new Date().toLocaleString('ja-JP')}</p>
        </div>

        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #374151; margin-top: 0;">推奨対応</h3>
          <ul style="color: #374151;">
            <li>管理画面で詳細状況を確認</li>
            <li>トークンの有効性を確認</li>
            <li>NextEngine APIの状態を確認</li>
            <li>必要に応じて手動で価格更新を実行</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="https://gold-price-updater-nextengine.vercel.app/admin"
             style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            📊 管理画面を確認
          </a>
        </div>
      </div>
    `

    const textContent = `
NextEngine 価格更新失敗

エラーメッセージ: ${errorMessage}
検出時刻: ${new Date().toLocaleString('ja-JP')}

推奨対応:
- 管理画面で詳細状況を確認
- トークンの有効性を確認
- NextEngine APIの状態を確認
- 必要に応じて手動で価格更新を実行

管理画面: https://gold-price-updater-nextengine.vercel.app/admin
    `

    return await this.sendEmail({
      to: this.toEmail,
      subject,
      htmlContent,
      textContent
    })
  }

  /**
   * 定期ヘルスレポート（週次）
   */
  async sendWeeklyHealthReport(stats: {
    successfulKeepalives: number
    failedKeepalives: number
    successfulPriceUpdates: number
    failedPriceUpdates: number
    lastPriceUpdate: Date | null
  }): Promise<boolean> {
    const subject = '📊 NextEngine 週次ヘルスレポート'
    
    const healthScore = Math.round(
      ((stats.successfulKeepalives + stats.successfulPriceUpdates) / 
       (stats.successfulKeepalives + stats.failedKeepalives + stats.successfulPriceUpdates + stats.failedPriceUpdates)) * 100
    )

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">📊 NextEngine 週次ヘルスレポート</h2>
        
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #334155; margin-top: 0;">システムヘルススコア</h3>
          <div style="font-size: 32px; font-weight: bold; text-align: center; color: ${healthScore >= 95 ? '#16a34a' : healthScore >= 85 ? '#f59e0b' : '#dc2626'};">
            ${healthScore}%
          </div>
        </div>

        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #374151; margin-top: 0;">実行統計（過去7日間）</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Keepalive成功:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #16a34a;">${stats.successfulKeepalives}回</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Keepalive失敗:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">${stats.failedKeepalives}回</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>価格更新成功:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #16a34a;">${stats.successfulPriceUpdates}回</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>価格更新失敗:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">${stats.failedPriceUpdates}回</td>
            </tr>
            <tr>
              <td style="padding: 8px;"><strong>最終価格更新:</strong></td>
              <td style="padding: 8px;">${stats.lastPriceUpdate ? stats.lastPriceUpdate.toLocaleString('ja-JP') : 'なし'}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="https://gold-price-updater-nextengine.vercel.app/admin" 
             style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
             📊 詳細レポートを確認
          </a>
        </div>
      </div>
    `

    const textContent = `
NextEngine 週次ヘルスレポート

システムヘルススコア: ${healthScore}%

実行統計（過去7日間）:
- Keepalive成功: ${stats.successfulKeepalives}回
- Keepalive失敗: ${stats.failedKeepalives}回  
- 価格更新成功: ${stats.successfulPriceUpdates}回
- 価格更新失敗: ${stats.failedPriceUpdates}回
- 最終価格更新: ${stats.lastPriceUpdate ? stats.lastPriceUpdate.toLocaleString('ja-JP') : 'なし'}

管理画面: https://gold-price-updater-nextengine.vercel.app/admin
    `

    return await this.sendEmail({
      to: this.toEmail,
      subject,
      htmlContent,
      textContent
    })
  }
}