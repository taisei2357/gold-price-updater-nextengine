import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkKeepAliveToday() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    console.log('📋 本日のKeepAliveログ\n')

    const logs = await prisma.keepAliveLog.findMany({
      where: {
        createdAt: {
          gte: today,
          lte: todayEnd,
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    if (logs.length === 0) {
      console.log('❌ 本日のKeepAliveログがありません')
      return
    }

    console.log(`合計: ${logs.length}件\n`)

    logs.forEach((log, index) => {
      const time = new Date(log.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
      const status = log.status === 'SUCCESS' ? '✅' : '❌'
      console.log(`${index + 1}. ${status} ${time} - ${log.message}`)
    })

    const successCount = logs.filter(l => l.status === 'SUCCESS').length
    const failedCount = logs.filter(l => l.status === 'FAILED').length

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`✅ 成功: ${successCount}件`)
    console.log(`❌ 失敗: ${failedCount}件`)

    // 12:00頃に実行されたか確認
    const noonLog = logs.find(log => {
      const hour = new Date(log.createdAt).getHours()
      return hour === 12
    })

    console.log('\n【12:00 JST の実行確認】')
    if (noonLog) {
      console.log(`✅ 12:00頃に実行されました: ${new Date(noonLog.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`)
    } else {
      console.log('❌ 12:00頃の実行が見つかりません')
    }
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkKeepAliveToday()
