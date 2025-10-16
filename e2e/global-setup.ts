// E2Eテストのグローバルセットアップ
import { config } from 'dotenv'
import { cleanupTestData, createTestUser, createTestOrganization, createAdminClient } from './helpers/test-setup'

// .env.localを読み込む
config({ path: '.env.local' })

async function globalSetup() {
  console.log('🚀 E2Eテストのグローバルセットアップ開始')

  try {
    // 1. 既存のテストデータをクリーンアップ
    await cleanupTestData()

    // 2. テスト用ユーザーを作成
    console.log('📝 テストユーザーを作成中...')

    // Supabase Admin Clientを取得
    const supabase = createAdminClient()

    // OPS権限ユーザー
    const opsUser = await createTestUser('ops@example.com', 'OpsPassword123!', {
      companyName: 'OPS Company',
      contactName: 'OPS User',
    })
    // OPS権限をプロフィールに設定
    await supabase.from('profiles').update({ is_ops: true }).eq('id', opsUser.id)

    // 管理者ユーザー
    const adminUser = await createTestUser('admin@example.com', 'AdminPassword123!', {
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
    const ownerUser = await createTestUser('owner@example.com', 'OwnerPassword123!', {
      companyName: 'Owner Company',
      contactName: 'Owner User',
    })
    await createTestOrganization(ownerUser.id, 'Owner Organization', 'owner-org')

    // 一般メンバーユーザー
    const memberUser = await createTestUser('member@example.com', 'MemberPassword123!', {
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

    // 組織未所属ユーザー
    await createTestUser('noorg@example.com', 'NoOrgPassword123!', {
      companyName: 'No Org Company',
      contactName: 'No Org User',
    })

    console.log('✅ グローバルセットアップ完了')
  } catch (error) {
    console.error('❌ グローバルセットアップ失敗:', error)
    throw error
  }
}

export default globalSetup
