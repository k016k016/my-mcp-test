// RLSポリシーを修正するスクリプト
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'

// .env.localを読み込む
config({ path: '.env.local' })

async function applyRLSFix() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ 環境変数が設定されていません')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🔧 RLSポリシーを修正中...\n')

  // 既存のINSERTポリシーを削除
  const dropPolicies = [
    'DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations',
    'DROP POLICY IF EXISTS "Users can create organizations" ON organizations',
    'DROP POLICY IF EXISTS "Anyone can create organizations" ON organizations',
  ]

  for (const sql of dropPolicies) {
    console.log(`実行中: ${sql}`)
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
    if (error && !error.message.includes('does not exist')) {
      console.warn(`⚠️  警告: ${error.message}`)
    }
  }

  // 新しいINSERTポリシーを作成
  const createPolicySQL = `
    CREATE POLICY "Authenticated users can create organizations"
    ON organizations FOR INSERT
    TO authenticated
    WITH CHECK (true);
  `

  console.log('\n新しいポリシーを作成中...')
  const { error: createError } = await supabase.rpc('exec_sql', { sql_query: createPolicySQL })

  if (createError) {
    console.error('❌ ポリシー作成エラー:', createError.message)
    console.log('\n📝 手動で実行してください:')
    console.log('   Supabase Dashboard > SQL Editor')
    console.log('   ファイル: supabase/scripts/fix-organizations-rls.sql')
    process.exit(1)
  }

  console.log('✅ ポリシー作成成功\n')

  // 確認テスト
  console.log('🧪 確認テスト: 組織作成権限チェック')

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

  console.log(`✅ テストユーザー作成: ${testEmail}`)

  // ユーザークライアントを作成
  const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  const { error: signInError } = await userClient.auth.signInWithPassword({
    email: testEmail,
    password: 'test1234',
  })

  if (signInError) {
    console.error('❌ ログインエラー:', signInError)
    return
  }

  // 組織を作成
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
    console.log('\n🔴 修正に失敗しました')
    console.log('📝 Supabase Dashboardで手動修正が必要です')
  } else {
    console.log('✅ 組織作成成功')
    console.log('\n🟢 RLSポリシー修正完了！')

    // クリーンアップ
    await supabase.from('organizations').delete().eq('id', org.id)
    console.log('🧹 テストデータをクリーンアップしました')
  }

  await supabase.auth.admin.deleteUser(authData.user.id)
  console.log('🧹 テストユーザーを削除しました')
}

applyRLSFix().catch((error) => {
  console.error('❌ エラー:', error)
  process.exit(1)
})
