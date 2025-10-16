// E2Eテストのグローバルティアダウン
import { config } from 'dotenv'
import { cleanupTestData } from './helpers/test-setup'

// .env.localを読み込む
config({ path: '.env.local' })

async function globalTeardown() {
  console.log('🧹 E2Eテストのグローバルティアダウン開始')

  try {
    // テスト実行後のクリーンアップ
    await cleanupTestData()

    console.log('✅ グローバルティアダウン完了')
  } catch (error) {
    console.error('❌ グローバルティアダウン失敗:', error)
    // ティアダウンの失敗はテスト結果に影響しないようにする
  }
}

export default globalTeardown
