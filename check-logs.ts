import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📊 Checking recent KeepAlive logs...\n')

  const logs = await prisma.keepAliveLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  })

  logs.forEach((log, index) => {
    console.log(`${index + 1}. [${log.status}] ${log.createdAt.toISOString()}`)
    console.log(`   Message: ${log.message}`)
    console.log('')
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
