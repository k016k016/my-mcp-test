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

    // OPS権限ユーザー
    const opsUser = await createTestUser('ops@example.com', TEST_PASSWORD, {
      companyName: 'OPS Company',
      contactName: 'OPS User',
    })
    // OPS権限をプロフィールに設定
    await supabase.from('profiles').update({ is_ops: true }).eq('id', opsUser.id)

    // 管理者ユーザー
    const adminUser = await createTestUser('admin@example.com', TEST_PASSWORD, {
      companyName: 'Admin Company',
      contactName: 'Admin User',
    })
    const adminOrg = await createTestOrganization(adminUser.id, 'Admin Organization', 'admin-org')

    // 管理者権限を設定
    await supabase
      .from('organization_members')
      .update({ role: 'admin' })
      .eq('user_id', adminUser.id)
      .eq('organization_id', adminOrg.id)

    // オーナーユーザー
    const ownerUser = await createTestUser('owner@example.com', TEST_PASSWORD, {
      companyName: 'Owner Company',
      contactName: 'Owner User',
    })
    await createTestOrganization(ownerUser.id, 'Owner Organization', 'owner-org')

    // 一般メンバーユーザー（複数組織に所属）
    const memberUser = await createTestUser('member@example.com', TEST_PASSWORD, {
      companyName: 'Member Company',
      contactName: 'Member User',
    })
    const memberOrg = await createTestOrganization(memberUser.id, 'Member Organization', 'member-org')

    // メンバー権限を設定（ownerからmemberに変更）
    await supabase
      .from('organization_members')
      .update({ role: 'member' })
      .eq('user_id', memberUser.id)
      .eq('organization_id', memberOrg.id)

    // memberユーザー用の2つ目の組織（組織切り替えテスト用）
    const memberOrg2 = await createTestOrganization(memberUser.id, 'Member Organization 2', 'member-org-2')
    // この組織でもmember権限に設定
    await supabase
      .from('organization_members')
      .update({ role: 'member' })
      .eq('user_id', memberUser.id)
      .eq('organization_id', memberOrg2.id)

    // 組織未所属ユーザー
    await createTestUser('noorg@example.com', TEST_PASSWORD, {
      companyName: 'No Org Company',
      contactName: 'No Org User',
    })

    // 複数組織所属ユーザー（multiorg）
    const multiOrgUser = await createTestUser('multiorg@example.com', TEST_PASSWORD, {
      companyName: 'Multi Org Company',
      contactName: 'Multi Org User',
    })

    // 組織1: MultiOrg Owner Organization（owner権限） - 名前を一意に
    const ownerOrganization = await createTestOrganization(
      multiOrgUser.id,
      'MultiOrg Owner Organization',
      'multiorg-owner-org'
    )
    // デフォルトでownerになるので、権限変更は不要

    // 組織2: MultiOrg Admin Organization（admin権限） - 名前を一意に
    const adminOrganization = await createTestOrganization(
      multiOrgUser.id,
      'MultiOrg Admin Organization',
      'multiorg-admin-org'
    )
    // admin権限に変更
    await supabase
      .from('organization_members')
      .update({ role: 'admin' })
      .eq('user_id', multiOrgUser.id)
      .eq('organization_id', adminOrganization.id)

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
