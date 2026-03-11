// NextEngine認証URL生成

const TEST_CLIENT_ID = 'YjbUalR6qcpeSF'
const PROD_CLIENT_ID = 'fPboRmOHZT13Ay'

console.log('🔗 NextEngine認証URL:\n')
console.log('テスト環境:')
console.log(`https://base.next-engine.org/users/sign_in?client_id=${TEST_CLIENT_ID}`)
console.log('\n本番環境 (base):')
console.log(`https://base.next-engine.org/users/sign_in?client_id=${PROD_CLIENT_ID}`)
console.log('\n本番環境 (main):')
console.log(`https://main.next-engine.org/users/sign_in?client_id=${PROD_CLIENT_ID}`)
console.log('\n📋 本番環境の場合、どちらのURLを使うべきか確認してください。')
