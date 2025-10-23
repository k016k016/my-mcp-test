// multiorg@example.com アカウントの自動作成スクリプト
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createMultiOrgUser() {
  console.log('🚀 multiorg@example.com アカウントの自動作成を開始...\n')

  // 1. 既存のユーザーをチェック
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers.users.find(u => u.email === 'multiorg@example.com')

  let userId

  if (existingUser) {
    console.log('✅ ユーザーは既に存在します')
    console.log(`   ユーザーID: ${existingUser.id}\n`)
    userId = existingUser.id
  } else {
    // 2. ユーザーを作成
    console.log('📝 ユーザーを作成中...')
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email: 'multiorg@example.com',
      password: 'test1234',
      email_confirm: true,
      user_metadata: {
        full_name: 'Multi Org User'
      }
    })

    if (userError) {
      console.error('❌ ユーザー作成エラー:', userError.message)
      return false
    }

    userId = newUser.user.id
    console.log('✅ ユーザーを作成しました')
    console.log(`   ユーザーID: ${userId}\n`)

    // 3. プロフィールを作成
    console.log('📝 プロフィールを作成中...')
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: 'multiorg@example.com',
        full_name: 'Multi Org User'
      })

    if (profileError) {
      console.error('⚠️  プロフィール作成エラー（無視）:', profileError.message)
    } else {
      console.log('✅ プロフィールを作成しました\n')
    }
  }

  // 4. 既存の組織を確認
  const { data: existingMemberships } = await supabase
    .from('organization_members')
    .select('organization_id, role, organization:organizations(name)')
    .eq('user_id', userId)
    .is('deleted_at', null)

  console.log(`📊 現在の所属組織: ${existingMemberships?.length || 0}個\n`)

  // 5. 組織1を作成（owner権限）
  let org1Id
  const org1Membership = existingMemberships?.find(m => m.role === 'owner')

  if (org1Membership) {
    console.log('✅ 組織1（owner権限）は既に存在します')
    console.log(`   組織名: ${org1Membership.organization.name}`)
    console.log(`   組織ID: ${org1Membership.organization_id}\n`)
    org1Id = org1Membership.organization_id
  } else {
    console.log('📝 組織1を作成中（Owner Organization）...')
    const { data: org1, error: org1Error } = await supabase
      .from('organizations')
      .insert({
        name: 'Owner Organization',
        subscription_plan: 'free',
        subscription_status: 'active'
      })
      .select()
      .single()

    if (org1Error) {
      console.error('❌ 組織1作成エラー:', org1Error.message)
      return false
    }

    org1Id = org1.id
    console.log('✅ 組織1を作成しました')
    console.log(`   組織ID: ${org1Id}\n`)

    // 6. ユーザーを組織1にowner権限で追加
    console.log('📝 ユーザーを組織1にowner権限で追加中...')
    const { error: member1Error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org1Id,
        user_id: userId,
        role: 'owner'
      })

    if (member1Error) {
      console.error('❌ メンバー追加エラー:', member1Error.message)
      return false
    }

    console.log('✅ owner権限で追加しました\n')
  }

  // 7. 組織2を作成（admin権限）
  const org2Membership = existingMemberships?.find(m =>
    m.role === 'admin' && m.organization_id !== org1Id
  )

  if (org2Membership) {
    console.log('✅ 組織2（admin権限）は既に存在します')
    console.log(`   組織名: ${org2Membership.organization.name}`)
    console.log(`   組織ID: ${org2Membership.organization_id}\n`)
  } else {
    console.log('📝 組織2を作成中（Admin Organization）...')
    const { data: org2, error: org2Error } = await supabase
      .from('organizations')
      .insert({
        name: 'Admin Organization',
        subscription_plan: 'free',
        subscription_status: 'active'
      })
      .select()
      .single()

    if (org2Error) {
      console.error('❌ 組織2作成エラー:', org2Error.message)
      return false
    }

    console.log('✅ 組織2を作成しました')
    console.log(`   組織ID: ${org2.id}\n`)

    // 8. ユーザーを組織2にadmin権限で追加
    console.log('📝 ユーザーを組織2にadmin権限で追加中...')
    const { error: member2Error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org2.id,
        user_id: userId,
        role: 'admin'
      })

    if (member2Error) {
      console.error('❌ メンバー追加エラー:', member2Error.message)
      return false
    }

    console.log('✅ admin権限で追加しました\n')
  }

  // 9. 最終確認
  console.log('🔍 最終確認中...')
  const { data: finalMemberships } = await supabase
    .from('organization_members')
    .select(`
      role,
      organization:organizations (
        id,
        name
      )
    `)
    .eq('user_id', userId)
    .is('deleted_at', null)

  console.log(`\n📊 所属組織: ${finalMemberships.length}個\n`)

  finalMemberships.forEach((m, index) => {
    console.log(`   ${index + 1}. ${m.organization.name}`)
    console.log(`      - 組織ID: ${m.organization.id}`)
    console.log(`      - 権限: ${m.role}`)
  })

  console.log('\n✅ Phase 1完了！multiorg@example.comアカウントの準備が整いました')
  console.log('🎉 Phase 2（E2Eテスト）に進めます\n')

  return true
}

createMultiOrgUser()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ エラー:', error)
    process.exit(1)
  })
