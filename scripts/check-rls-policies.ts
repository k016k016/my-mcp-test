// RLSポリシーの状態を確認するスクリプト
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// .env.localを読み込む
config({ path: '.env.local' })

async function checkRLSPolicies() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ 環境変数が設定されていません')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🔍 organizationsテーブルのRLSポリシーを確認中...\n')

  // ポリシー一覧を取得
  const { data: policies, error } = await supabase.rpc('get_policies', {
    table_name: 'organizations'
  })

  if (error) {
    // カスタム関数がない場合、直接SQLで確認
    console.log('📋 直接SQL確認を試みます...\n')

    const { data, error: queryError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'organizations')

    if (queryError) {
      console.error('❌ ポリシー取得エラー:', queryError.message)
      console.log('\n💡 Supabase Dashboardで確認してください:')
      console.log('   Authentication > Policies > organizations')
    } else {
      console.log('✅ ポリシー一覧:', JSON.stringify(data, null, 2))
    }
  } else {
    console.log('✅ ポリシー一覧:', JSON.stringify(policies, null, 2))
  }

  // テスト: 認証済みユーザーとして組織を作成できるか
  console.log('\n🧪 テスト: 組織作成権限チェック')

  // まずテストユーザーを作成
  const testEmail = `test-rls-${Date.now()}@example.com`
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'test1234',
    email_confirm: true,
  })

  if (authError || !authData.user) {
    console.error('❌ テストユーザー作成エラー:', authError)
    return
  }

  console.log(`✅ テストユーザー作成: ${testEmail} (${authData.user.id})`)

  // ユーザークライアントを作成（サービスロールではなく通常ユーザーとして）
  const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  // テストユーザーとしてログイン
  const { data: signInData, error: signInError } = await userClient.auth.signInWithPassword({
    email: testEmail,
    password: 'test1234',
  })

  if (signInError) {
    console.error('❌ ログインエラー:', signInError)
    return
  }

  console.log('✅ テストユーザーでログイン成功')
  console.log('   セッション:', signInData.session ? '有効' : '無効')
  console.log('   アクセストークン:', signInData.session?.access_token ? '存在' : '存在しない')

  // セッションを取得して確認
  const { data: sessionData } = await userClient.auth.getSession()
  console.log('   現在のセッション:', sessionData.session ? '有効' : '無効')

  // 組織を作成してみる
  const { data: org, error: orgError } = await userClient
    .from('organizations')
    .insert({
      name: 'Test Organization RLS',
      subscription_plan: 'free',
      subscription_status: 'active',
    })
    .select()
    .single()

  if (orgError) {
    console.error('❌ 組織作成エラー:', orgError)
    console.log('\n🔴 RLSポリシーが正しく設定されていません！')
    console.log('📝 修正が必要: organizationsテーブルのINSERTポリシー')
  } else {
    console.log('✅ 組織作成成功:', org)
    console.log('\n🟢 RLSポリシーは正常です')

    // テストデータをクリーンアップ
    await supabase.from('organizations').delete().eq('id', org.id)
    console.log('🧹 テストデータをクリーンアップしました')
  }

  // テストユーザーを削除
  await supabase.auth.admin.deleteUser(authData.user.id)
  console.log('🧹 テストユーザーを削除しました')
}

checkRLSPolicies().catch(console.error)
