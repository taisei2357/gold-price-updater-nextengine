import { NextRequest } from 'next/server'
import { EmailNotifier } from '@/lib/email-notifier'

/**
 * メール通知テスト用エンドポイント
 * 手動でメール通知をテストする際に使用
 */
export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json()
    const emailNotifier = new EmailNotifier()
    
    let sent = false
    let message = ''

    switch (type) {
      case 'token-expiration':
        sent = await emailNotifier.sendTokenExpirationWarning()
        message = 'Token expiration warning sent'
        break

      case 'keepalive-failure':
        sent = await emailNotifier.sendKeepAliveFailure('Test keepalive failure message', 1)
        message = 'Keepalive failure notification sent'
        break

      case 'system-recovery':
        sent = await emailNotifier.sendSystemRecovery()
        message = 'System recovery notification sent'
        break

      case 'keepalive-success':
        sent = await emailNotifier.sendKeepAliveSuccess(false)
        message = 'Keepalive success notification sent'
        break

      case 'weekly-report':
        sent = await emailNotifier.sendWeeklyHealthReport({
          successfulKeepalives: 14,
          failedKeepalives: 0,
          successfulPriceUpdates: 5,
          failedPriceUpdates: 0,
          lastPriceUpdate: new Date()
        })
        message = 'Weekly health report sent'
        break

      default:
        return Response.json({
          success: false,
          error: 'Invalid email type. Use: token-expiration, keepalive-failure, system-recovery, keepalive-success, weekly-report'
        }, { status: 400 })
    }

    console.log(`📧 Test email sent (${type}): ${sent ? 'Success' : 'Failed'}`)

    return Response.json({
      success: sent,
      message,
      type,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Test email failed:', errorMessage)

    return Response.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * メール設定状況確認用
 */
export async function GET(request: NextRequest) {
  try {
    const hasApiKey = !!(process.env.SENDGRID_API_KEY)
    const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || 'system@nextengine-updater.com'
    const toEmail = process.env.NOTIFICATION_TO_EMAIL || 'admin@example.com'

    return Response.json({
      success: true,
      config: {
        hasApiKey,
        fromEmail,
        toEmail: hasApiKey ? toEmail : '[Hidden - API key not configured]'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Email config check failed:', errorMessage)

    return Response.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}