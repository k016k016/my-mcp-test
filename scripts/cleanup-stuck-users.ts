// 残留ユーザーを完全に削除するスクリプト
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

async function cleanupStuckUsers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ 環境変数が設定されていません')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🧹 残留ユーザーをクリーンアップ中...\n')

  // 削除対象のメールアドレス
  const targetEmails = [
    'member@example.com',
    'admin@example.com',
    'owner@example.com',
    'ops@example.com',
  ]

  for (const email of targetEmails) {
    console.log(`📧 ${email} を削除中...`)

    // ユーザーIDを取得
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users?.users.find((u) => u.email === email)

    if (!user) {
      console.log(`   ℹ️  ユーザーが見つかりません（既に削除済み）`)
      continue
    }

    const userId = user.id
    console.log(`   ユーザーID: ${userId}`)

    // 1. Wiki pages を削除
    try {
      const { error: wikiError } = await supabase
        .from('wiki_pages')
        .delete()
        .eq('created_by', userId)

      if (wikiError && wikiError.code !== 'PGRST116') {
        console.warn(`   ⚠️  Wiki削除警告: ${wikiError.message}`)
      } else if (!wikiError) {
        console.log(`   ✅ Wiki pages削除完了`)
      }
    } catch (error) {
      console.warn(`   ⚠️  Wiki削除エラー（スキップ）`)
    }

    // 2. 所属組織を取得
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)

    const orgIds = memberships?.map((m) => m.organization_id) || []

    if (orgIds.length > 0) {
      console.log(`   所属組織数: ${orgIds.length}`)

      for (const orgId of orgIds) {
        // 3. 組織のWikiページを削除
        try {
          await supabase.from('wiki_pages').delete().eq('organization_id', orgId)
        } catch (error) {
          // スキップ
        }

        // 4. 組織の全メンバーシップを削除
        try {
          await supabase
            .from('organization_members')
            .delete()
            .eq('organization_id', orgId)
        } catch (error) {
          // スキップ
        }

        // 5. 組織を削除
        try {
          const { error: orgError } = await supabase
            .from('organizations')
            .delete()
            .eq('id', orgId)

          if (orgError && orgError.code !== 'PGRST116') {
            console.warn(`   ⚠️  組織削除警告: ${orgError.message}`)
          }
        } catch (error) {
          // スキップ
        }
      }
      console.log(`   ✅ 組織削除完了`)
    }

    // 6. プロフィールを削除
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (profileError && profileError.code !== 'PGRST116') {
        console.warn(`   ⚠️  プロフィール削除警告: ${profileError.message}`)
      } else if (!profileError) {
        console.log(`   ✅ プロフィール削除完了`)
      }
    } catch (error) {
      console.warn(`   ⚠️  プロフィール削除エラー（スキップ）`)
    }

    // 7. 認証ユーザーを削除
    try {
      const { error: authError } = await supabase.auth.admin.deleteUser(userId)

      if (authError) {
        console.error(`   ❌ ユーザー削除エラー: ${authError.message}`)
      } else {
        console.log(`   ✅ ユーザー削除完了`)
      }
    } catch (error) {
      console.error(`   ❌ ユーザー削除エラー`)
    }

    console.log('')
  }

  console.log('✅ クリーンアップ完了')
}

cleanupStuckUsers().catch((error) => {
  console.error('❌ エラー:', error)
  process.exit(1)
})
