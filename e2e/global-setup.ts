// E2Eテストのグローバルセットアップ
import { config } from 'dotenv'
import { chromium, FullConfig } from '@playwright/test'
import path from 'path'
import { cleanupTestData, createTestUser, createTestOrganization, createAdminClient } from './helpers/test-setup'

// .env.localを読み込む
config({ path: '.env.local' })

// storageStateの保存先ディレクトリ
const authDir = path.join(__dirname, '../.auth')

async function globalSetup(config: FullConfig) {
  console.log('🚀 E2Eテストのグローバルセットアップ開始')

  try {
    // 1. 既存のテストデータをクリーンアップ
    await cleanupTestData()

    // 2. テスト用ユーザーを作成
    console.log('📝 テストユーザーを作成中...')

    // Supabase Admin Clientを取得
    const supabase = createAdminClient()

    // 共通パスワード（テスト用）
    const TEST_PASSWORD = 'test1234'

    // === Test Organization（owner@, admin@, member@が同じ組織に所属） ===
    const ownerUser = await createTestUser('owner@example.com', TEST_PASSWORD, {
      companyName: 'Test Organization',
      contactName: 'Owner User',
    })
    const testOrg = await createTestOrganization(ownerUser.id, 'Test Organization', 'test-org')

    // admin@を作成してTest Organizationにadminとして追加
    const adminUser = await createTestUser('admin@example.com', TEST_PASSWORD, {
      companyName: 'Test Organization',
      contactName: 'Admin User',
    })
    await supabase
      .from('organization_members')
      .insert({
        organization_id: testOrg.id,
        user_id: adminUser.id,
        role: 'admin',
      })

    // member@を作成してTest Organizationにmemberとして追加
    const memberUser = await createTestUser('member@example.com', TEST_PASSWORD, {
      companyName: 'Test Organization',
      contactName: 'Member User',
    })
    await supabase
      .from('organization_members')
      .insert({
        organization_id: testOrg.id,
        user_id: memberUser.id,
        role: 'member',
      })

    // === Individual Organizations（各自が独立した組織のowner） ===

    // ops@（OPS権限 + Owner1 Organization）
    const opsUser = await createTestUser('ops@example.com', TEST_PASSWORD, {
      companyName: 'OPS Organization',
      contactName: 'OPS User',
    })
    await createTestOrganization(opsUser.id, 'OPS Organization', 'ops-org')
    await supabase.from('profiles').update({ is_ops: true }).eq('id', opsUser.id)

    // owner1@（Owner1 Organization）
    const owner1User = await createTestUser('owner1@example.com', TEST_PASSWORD, {
      companyName: 'Owner1 Organization',
      contactName: 'Owner1 User',
    })
    const owner1Org = await createTestOrganization(owner1User.id, 'Owner1 Organization', 'owner1-org')

    // owner2@（Owner2 Organization）
    const owner2User = await createTestUser('owner2@example.com', TEST_PASSWORD, {
      companyName: 'Owner2 Organization',
      contactName: 'Owner2 User',
    })
    await createTestOrganization(owner2User.id, 'Owner2 Organization', 'owner2-org')

    // owner3@（Owner3 Organization）
    const owner3User = await createTestUser('owner3@example.com', TEST_PASSWORD, {
      companyName: 'Owner3 Organization',
      contactName: 'Owner3 User',
    })
    await createTestOrganization(owner3User.id, 'Owner3 Organization', 'owner3-org')

    // === 組織切り替えテスト用: member@がOwner1 Organizationにもmemberとして参加 ===
    await supabase
      .from('organization_members')
      .insert({
        organization_id: owner1Org.id,
        user_id: memberUser.id,
        role: 'member',
      })

    // 3. storageStateを生成（ログイン状態を保存）
    console.log('🔐 storageStateを生成中...')

    // Chromiumブラウザを起動（storageState生成用）
    const browser = await chromium.launch()

    // 各ロールのstorageStateを生成
    await generateStorageState(browser, 'member@example.com', TEST_PASSWORD, 'member')
    await generateStorageState(browser, 'admin@example.com', TEST_PASSWORD, 'admin')
    await generateStorageState(browser, 'owner@example.com', TEST_PASSWORD, 'owner')
    await generateStorageState(browser, 'ops@example.com', TEST_PASSWORD, 'ops')

    await browser.close()

    console.log('✅ グローバルセットアップ完了')
  } catch (error) {
    console.error('❌ グローバルセットアップ失敗:', error)
    throw error
  }
}

/**
 * ログインしてstorageStateを生成
 */
async function generateStorageState(
  browser: any,
  email: string,
  password: string,
  roleName: string
) {
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // WWWドメインのログインページにアクセス
    const loginUrl = roleName === 'ops'
      ? 'http://ops.local.test:3000/login'
      : 'http://www.local.test:3000/login'

    await page.goto(loginUrl, { waitUntil: 'networkidle' })

    // ログインフォームに入力
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.click('button[type="submit"]:has-text("ログイン")')

    // ログイン後のリダイレクトを待機
    await page.waitForURL((url) => {
      const urlStr = url.toString()
      return !urlStr.includes('www.local.test') && !urlStr.includes('ops.local.test/login')
    }, { timeout: 30000 })

    // ページが完全にロードされるまで待機
    await page.waitForLoadState('networkidle')

    // storageStateを保存
    const storagePath = path.join(authDir, `${roleName}.json`)
    await context.storageState({ path: storagePath })

    console.log(`   ✅ ${roleName} storageState保存: ${storagePath}`)
  } catch (error) {
    console.error(`   ❌ ${roleName} storageState生成失敗:`, error)
    throw error
  } finally {
    await context.close()
  }
}

export default globalSetup
