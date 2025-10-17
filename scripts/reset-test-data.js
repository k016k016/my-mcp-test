// テストデータをリセットするスクリプト
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Supabase環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function cleanupTestData() {
  console.log('🧹 テストデータをクリーンアップ中...')

  try {
    // テスト用プロフィールを取得
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .like('email', 'test-%@example.com')

    if (profilesError) {
      console.error('プロフィール取得エラー:', profilesError)
      return
    }

    // test@example.com と owner@example.com も追加
    const { data: fixedUsers } = await supabase
      .from('profiles')
      .select('id, email')
      .in('email', ['test@example.com', 'owner@example.com'])

    const allProfiles = [...(profiles || []), ...(fixedUsers || [])]

    if (allProfiles.length === 0) {
      console.log('✨ クリーンアップ不要（テストデータなし）')
      return
    }

    const userIds = allProfiles.map((p) => p.id)
    console.log(`📧 ${allProfiles.length}件のテストユーザーを削除します`)

    // 関連する組織メンバーシップを削除
    await supabase.from('organization_members').delete().in('user_id', userIds)

    // テストユーザーが所有する組織を取得
    const { data: ownedOrgs } = await supabase
      .from('organization_members')
      .select('organization_id')
      .in('user_id', userIds)
      .eq('role', 'owner')

    if (ownedOrgs && ownedOrgs.length > 0) {
      const orgIds = ownedOrgs.map((o) => o.organization_id)
      await supabase.from('organization_members').delete().in('organization_id', orgIds)
      await supabase.from('organizations').delete().in('id', orgIds)
    }

    // テスト組織を名前で削除
    await supabase.from('organizations').delete().in('name', ['Test Organization', 'Owner Organization'])

    // プロフィールを削除
    await supabase.from('profiles').delete().in('id', userIds)

    // 認証ユーザーを削除
    for (const userId of userIds) {
      await supabase.auth.admin.deleteUser(userId)
    }

    console.log('✅ テストデータのクリーンアップ完了')
  } catch (error) {
    console.error('❌ クリーンアップ中にエラー発生:', error)
  }
}

async function createTestUsers() {
  console.log('👤 テストユーザーを作成中...')

  const users = [
    {
      email: 'test@example.com',
      password: 'password123',
      companyName: 'Test Company',
      contactName: 'Test User',
      orgName: 'Test Organization',
      // slug は削除されたため使用しない
    },
    {
      email: 'owner@example.com',
      password: 'password123',
      companyName: 'Owner Company',
      contactName: 'Owner User',
      orgName: 'Owner Organization',
      // slug は削除されたため使用しない
    },
  ]

  for (const user of users) {
    // ユーザー作成
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        company_name: user.companyName,
        name: user.contactName,
      },
    })

    if (error) {
      console.error(`❌ ユーザー作成失敗 (${user.email}):`, error.message)
      continue
    }

    console.log(`✅ ユーザー作成: ${user.email}`)

    // プロフィール更新
    await supabase
      .from('profiles')
      .update({
        company_name: user.companyName,
        name: user.contactName,
      })
      .eq('id', data.user.id)

    // 組織作成
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: user.orgName,
        subscription_plan: 'free',
        subscription_status: 'active',
      })
      .select()
      .single()

    if (orgError) {
      console.error(`❌ 組織作成失敗 (${user.orgName}):`, orgError.message)
      continue
    }

    // オーナーとして追加
    await supabase.from('organization_members').insert({
      organization_id: org.id,
      user_id: data.user.id,
      role: 'owner',
    })

    console.log(`✅ 組織作成: ${user.orgName}`)
  }
}

async function main() {
  console.log('🚀 テストデータリセット開始\n')

  await cleanupTestData()
  console.log('')
  await createTestUsers()

  console.log('\n✨ 完了！以下の認証情報でログインできます：')
  console.log('   📧 test@example.com / password123')
  console.log('   📧 owner@example.com / password123')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ エラー:', error)
    process.exit(1)
  })
