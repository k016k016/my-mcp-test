// multiorg@example.com アカウントの確認スクリプト
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMultiOrgUser() {
  console.log('🔍 multiorg@example.com アカウントを確認中...\n')

  // 1. ユーザーの存在確認
  const { data: users, error: userError } = await supabase.auth.admin.listUsers()

  if (userError) {
    console.error('❌ ユーザー取得エラー:', userError.message)
    return false
  }

  const multiOrgUser = users.users.find(u => u.email === 'multiorg@example.com')

  if (!multiOrgUser) {
    console.log('❌ multiorg@example.com アカウントが見つかりません')
    console.log('📝 Phase 1の手動作業が必要です:')
    console.log('   1. http://www.local.test:3000/signup でアカウント作成')
    console.log('   2. Supabase Dashboardで組織2を追加')
    return false
  }

  console.log('✅ multiorg@example.com アカウントが見つかりました')
  console.log(`   ユーザーID: ${multiOrgUser.id}`)
  console.log(`   メール: ${multiOrgUser.email}\n`)

  // 2. 所属組織の確認
  const { data: memberships, error: memberError } = await supabase
    .from('organization_members')
    .select(`
      role,
      organization:organizations (
        id,
        name
      )
    `)
    .eq('user_id', multiOrgUser.id)
    .is('deleted_at', null)

  if (memberError) {
    console.error('❌ 組織メンバーシップ取得エラー:', memberError.message)
    return false
  }

  console.log(`📊 所属組織: ${memberships.length}個\n`)

  if (memberships.length === 0) {
    console.log('❌ 組織に所属していません')
    console.log('📝 Supabase Dashboardで組織を追加してください')
    return false
  }

  memberships.forEach((m, index) => {
    console.log(`   ${index + 1}. ${m.organization.name}`)
    console.log(`      - 組織ID: ${m.organization.id}`)
    console.log(`      - 権限: ${m.role}`)
  })

  console.log('')

  if (memberships.length < 2) {
    console.log('⚠️  組織が1つしかありません（2つ必要）')
    console.log('📝 Supabase Dashboardで組織2を追加してください:')
    console.log(`   1. 組織2を作成: INSERT INTO organizations...`)
    console.log(`   2. ユーザーID ${multiOrgUser.id} を組織2にadmin権限で追加`)
    return false
  }

  console.log('✅ Phase 1完了！2つの組織に所属しています')
  console.log('🎉 Phase 2（E2Eテスト）に進めます\n')
  return true
}

checkMultiOrgUser()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ エラー:', error)
    process.exit(1)
  })
