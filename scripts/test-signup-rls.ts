// サインアップのRLS修正をテストするスクリプト
// Server Actionsをテストするため、Supabase Auth/Admin APIを直接使用
import { config } from 'dotenv'

config({ path: '.env.local' })

async function testSignup() {
  const testEmail = `test-rls-${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'
  const companyName = 'Test Company RLS'
  const contactName = 'Test User'

  console.log('🧪 サインアップRLSテスト開始')
  console.log(`   テストユーザー: ${testEmail}`)

  try {
    const { createClient } = await import('@supabase/supabase-js')

    // 通常のSupabaseクライアント（認証用）
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    console.log('\n📤 サインアップ実行中...')
    const { data, error } = await supabaseAnon.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          company_name: companyName,
          name: contactName,
        },
      },
    })

    if (error) {
      console.error('\n❌ サインアップ失敗:', error.message)
      process.exit(1)
    }

    if (!data.user) {
      console.error('\n❌ ユーザーデータが取得できませんでした')
      process.exit(1)
    }

    console.log('\n✅ サインアップ成功！')
    console.log('   ユーザーID:', data.user.id)
    console.log('   セッション:', data.session ? 'あり' : 'なし（メール確認必要）')

    // セッションがある場合、組織を作成してみる
    if (data.session) {
      console.log('\n📤 組織作成を試行中（RLSテスト）...')

      // セッション付きクライアントを作成
      // Node.js環境ではsetSession()だけでは不十分なので、
      // global.headers経由でAuthorizationヘッダーを設定
      const supabaseAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${data.session.access_token}`,
            },
          },
        }
      )

      // 認証状態を確認
      const { data: { user: currentUser } } = await supabaseAuth.auth.getUser()
      console.log('   Authorizationヘッダー設定済み')
      console.log('   現在のユーザーID:', currentUser?.id)
      console.log('   ユーザー一致:', currentUser?.id === data.user.id)

      // 組織を作成（RLS認証済みコンテキストで）
      const { data: organization, error: orgError } = await supabaseAuth
        .from('organizations')
        .insert({
          name: companyName,
          subscription_plan: 'free',
          subscription_status: 'active',
        })
        .select()
        .single()

      if (orgError) {
        console.error('\n❌ 組織作成失敗（RLS問題の可能性）:', orgError)
        console.error('   Code:', orgError.code)
        console.error('   Details:', orgError.details)
        process.exit(1)
      }

      console.log('✅ 組織作成成功:', organization.name, '(ID:', organization.id + ')')

      // メンバーシップを作成
      const { error: memberError } = await supabaseAuth.from('organization_members').insert({
        organization_id: organization.id,
        user_id: data.user.id,
        role: 'owner',
      })

      if (memberError) {
        console.error('\n❌ メンバーシップ作成失敗:', memberError)
        process.exit(1)
      }

      console.log('✅ メンバーシップ作成成功')
      console.log('\n🎉 すべてのテスト成功！RLS修正が正しく動作しています')
    }

    // クリーンアップ（Admin APIで）
    console.log('\n🧹 テストデータをクリーンアップ中...')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 組織とメンバーシップを削除
    const { data: orgs } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('name', companyName)

    if (orgs && orgs.length > 0) {
      await supabaseAdmin.from('organization_members').delete().eq('user_id', data.user.id)
      await supabaseAdmin.from('organizations').delete().eq('id', orgs[0].id)
    }

    await supabaseAdmin.from('profiles').delete().eq('id', data.user.id)
    await supabaseAdmin.auth.admin.deleteUser(data.user.id)
    console.log('✅ クリーンアップ完了')

  } catch (error) {
    console.error('\n❌ テストエラー:', error)
    process.exit(1)
  }
}

testSignup().catch(console.error)
