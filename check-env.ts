// 環境変数のチェック（改行や余分な文字の確認）

import { config } from 'dotenv'
config({ path: '.env.local' })

const clientId = process.env.NE_CLIENT_ID
const clientSecret = process.env.NE_CLIENT_SECRET

console.log('🔍 Environment Variables Check:\n')

console.log('NE_CLIENT_ID:')
console.log(`  Value: "${clientId}"`)
console.log(`  Length: ${clientId?.length}`)
console.log(`  Has newline: ${clientId?.includes('\n')}`)
console.log(`  Has spaces: ${clientId?.includes(' ')}`)
console.log(`  Hex: ${Buffer.from(clientId || '', 'utf8').toString('hex')}`)

console.log('\nNE_CLIENT_SECRET:')
console.log(`  Value: "${clientSecret}"`)
console.log(`  Length: ${clientSecret?.length}`)
console.log(`  Has newline: ${clientSecret?.includes('\n')}`)
console.log(`  Has spaces: ${clientSecret?.includes(' ')}`)
console.log(`  Hex: ${Buffer.from(clientSecret || '', 'utf8').toString('hex').substring(0, 80)}...`)
