import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkKeepAliveRecent() {
  try {
    console.log('📋 KeepAliveログ（最新20件）\n')

    const logs = await prisma.keepAliveLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    if (logs.length === 0) {
      console.log('❌ KeepAliveログがありません')
      return
    }

    logs.forEach((log, index) => {
      const time = new Date(log.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
      const status = log.status === 'SUCCESS' ? '✅' : '❌'
      console.log(`${index + 1}. ${status} ${time} - ${log.message}`)
    })

    // 最新のログの日付を確認
    const latestLog = logs[0]
    const latestDate = new Date(latestLog.createdAt)
    const now = new Date()
    const hoursSinceLatest = (now.getTime() - latestDate.getTime()) / (1000 * 60 * 60)

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`最新実行: ${new Date(latestLog.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`)
    console.log(`経過時間: ${hoursSinceLatest.toFixed(1)}時間前`)

    if (hoursSinceLatest > 24) {
      console.log('⚠️ 警告: 24時間以上実行されていません！')
    }
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkKeepAliveRecent()
