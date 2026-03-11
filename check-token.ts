import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking master token...\n')

  const token = await prisma.nextEngineToken.findUnique({
    where: { id: 1 }
  })

  if (token) {
    console.log('Master Token Found:')
    console.log(`  ID: ${token.id}`)
    console.log(`  Access Token: ${token.accessToken.substring(0, 50)}...`)
    console.log(`  Refresh Token: ${token.refreshToken.substring(0, 50)}...`)
    console.log(`  Updated At: ${token.updatedAt.toISOString()}`)
  } else {
    console.log('❌ No master token found!')
  }

  console.log('\n🔍 Checking sessions...\n')

  const sessions = await prisma.session.findMany()

  sessions.forEach((session, index) => {
    console.log(`Session ${index + 1}:`)
    console.log(`  UID: ${session.uid}`)
    console.log(`  Access Token: ${session.accessToken.substring(0, 50)}...`)
    console.log(`  Refresh Token: ${session.refreshToken.substring(0, 50)}...`)
    console.log(`  Updated At: ${session.updatedAt.toISOString()}`)
    console.log('')
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
