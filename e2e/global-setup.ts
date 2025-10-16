// E2Eテストのグローバルセットアップ
import { config } from 'dotenv'
import { cleanupTestData, createTestUser, createTestOrganization } from './helpers/test-setup'

// .env.localを読み込む
config({ path: '.env.local' })

async function globalSetup() {
  console.log('🚀 E2Eテストのグローバルセットアップ開始')

  try {
    // 1. 既存のテストデータをクリーンアップ
    await cleanupTestData()

    // 2. 固定テストユーザーを作成（ログインテスト用）
    const testUser = await createTestUser('test@example.com', 'password123', {
      companyName: 'Test Company',
      contactName: 'Test User',
    })

    // 3. テストユーザー用の組織を作成
    await createTestOrganization(testUser.id, 'Test Organization', 'test-org')

    // 4. オーナーユーザーを作成（メンバー管理テスト用）
    const ownerUser = await createTestUser('owner@example.com', 'password123', {
      companyName: 'Owner Company',
      contactName: 'Owner User',
    })

    await createTestOrganization(ownerUser.id, 'Owner Organization', 'owner-org')

    console.log('✅ グローバルセットアップ完了')
  } catch (error) {
    console.error('❌ グローバルセットアップ失敗:', error)
    throw error
  }
}

export default globalSetup
