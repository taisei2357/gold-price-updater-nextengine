import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

// .env.local ファイルを読み込む
config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Refreshing master token...\n')

  // マスタートークンを取得
  const masterToken = await prisma.nextEngineToken.findUnique({
    where: { id: 1 }
  })

  if (!masterToken) {
    console.error('❌ Master token not found!')
    return
  }

  console.log('Current master token:')
  console.log(`  Access Token: ${masterToken.accessToken.substring(0, 50)}...`)
  console.log(`  Refresh Token: ${masterToken.refreshToken.substring(0, 50)}...`)
  console.log(`  Updated At: ${masterToken.updatedAt.toISOString()}\n`)

  // 環境変数を確認
  const clientId = process.env.NE_CLIENT_ID
  const clientSecret = process.env.NE_CLIENT_SECRET

  if (!clientId || !clientSecret || clientId === 'your_nextengine_client_id') {
    console.error('❌ NE_CLIENT_ID or NE_CLIENT_SECRET not properly configured!')
    console.log('Please set these in Vercel environment variables.')
    return
  }

  console.log('🔑 Using CLIENT_ID:', clientId.substring(0, 10) + '...')
  console.log('🔄 Attempting to refresh token via API call...\n')

  try {
    // NextEngineは通常のAPI呼び出しで自動的にトークンをリフレッシュする
    // /api_v1_login_user/info を呼び出してトークンを更新
    const response = await fetch('https://api.next-engine.org/api_v1_login_user/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        access_token: masterToken.accessToken,
        refresh_token: masterToken.refreshToken
      })
    })

    console.log('Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Token refresh failed:', response.status, errorText)
      return
    }

    const result = await response.json()
    console.log('Response:', JSON.stringify(result, null, 2))

    if (result.access_token && result.refresh_token) {
      // 新しいトークンをDBに保存
      await prisma.nextEngineToken.update({
        where: { id: 1 },
        data: {
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
          updatedAt: new Date()
        }
      })

      console.log('\n✅ Token refreshed successfully!')
      console.log(`  New Access Token: ${result.access_token.substring(0, 50)}...`)
      console.log(`  New Refresh Token: ${result.refresh_token.substring(0, 50)}...`)
    } else {
      console.error('❌ Invalid token response - missing tokens')
    }
  } catch (error) {
    console.error('❌ Error refreshing token:', error)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
