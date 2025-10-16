// E2Eテスト用のセットアップヘルパー
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Supabase Admin Client（テストデータのクリーンアップ用）
// 注意: これはサービスロールキーを使用するため、テスト環境のみで使用
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase環境変数が設定されていません')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * テストデータをクリーンアップ
 * - テスト用メールアドレス（test-*@example.com）のユーザーを削除
 */
export async function cleanupTestData() {
  const supabase = createAdminClient()

  try {
    console.log('🧹 テストデータをクリーンアップ中...')

    // 1. テスト用プロフィールを取得
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .like('email', 'test-%@example.com')

    if (profilesError) {
      console.error('プロフィール取得エラー:', profilesError)
      return
    }

    if (!profiles || profiles.length === 0) {
      console.log('✨ クリーンアップ不要（テストデータなし）')
      return
    }

    const userIds = profiles.map((p) => p.id)
    console.log(`📧 ${profiles.length}件のテストユーザーを削除します`)

    // 2. 関連する組織メンバーシップを削除
    const { error: membersError } = await supabase
      .from('organization_members')
      .delete()
      .in('user_id', userIds)

    if (membersError && membersError.code !== 'PGRST116') {
      // PGRST116 = No rows found (削除対象なし)
      console.error('メンバーシップ削除エラー:', membersError)
    }

    // 3. テストユーザーが所有する組織を削除
    const { data: ownedOrgs } = await supabase
      .from('organization_members')
      .select('organization_id')
      .in('user_id', userIds)
      .eq('role', 'owner')

    if (ownedOrgs && ownedOrgs.length > 0) {
      const orgIds = ownedOrgs.map((o) => o.organization_id)

      // 組織メンバーを削除
      await supabase.from('organization_members').delete().in('organization_id', orgIds)

      // 組織を削除
      const { error: orgsError } = await supabase
        .from('organizations')
        .delete()
        .in('id', orgIds)

      if (orgsError) {
        console.error('組織削除エラー:', orgsError)
      }
    }

    // 4. プロフィールを削除
    const { error: deleteProfilesError } = await supabase
      .from('profiles')
      .delete()
      .in('id', userIds)

    if (deleteProfilesError) {
      console.error('プロフィール削除エラー:', deleteProfilesError)
    }

    // 5. 認証ユーザーを削除（Admin API使用）
    for (const userId of userIds) {
      const { error } = await supabase.auth.admin.deleteUser(userId)
      if (error) {
        console.error(`ユーザー ${userId} 削除エラー:`, error)
      }
    }

    console.log('✅ テストデータのクリーンアップ完了')
  } catch (error) {
    console.error('❌ クリーンアップ中にエラー発生:', error)
    throw error
  }
}

/**
 * テスト用の固定ユーザーを作成
 * @returns 作成されたユーザーの情報
 */
export async function createTestUser(
  email: string,
  password: string,
  options?: {
    companyName?: string
    contactName?: string
  }
) {
  const supabase = createAdminClient()

  try {
    // 既存ユーザーがいる場合は削除
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users.find((u) => u.email === email)

    if (existingUser) {
      console.log(`🔄 既存ユーザーを削除: ${email}`)
      await supabase.auth.admin.deleteUser(existingUser.id)
    }

    // ユーザーを作成（メール確認なし）
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // メール確認をスキップ
      user_metadata: {
        company_name: options?.companyName || 'Test Company',
        name: options?.contactName || 'Test User',
      },
    })

    if (error || !data.user) {
      console.error('ユーザー作成エラー:', error)
      throw error
    }

    // プロフィールを更新（トリガーで作成されたものを更新）
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        company_name: options?.companyName || 'Test Company',
        name: options?.contactName || 'Test User',
      })
      .eq('id', data.user.id)

    if (profileError) {
      console.error('プロフィール更新エラー:', profileError)
    }

    console.log(`✅ テストユーザー作成: ${email} (ID: ${data.user.id})`)
    console.log(`   - email_confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`)

    return {
      id: data.user.id,
      email: data.user.email!,
    }
  } catch (error) {
    console.error('❌ テストユーザー作成エラー:', error)
    throw error
  }
}

/**
 * テスト用の組織を作成
 */
export async function createTestOrganization(
  userId: string,
  name: string,
  slug: string
) {
  const supabase = createAdminClient()

  try {
    // 既存の組織があれば削除
    const { data: existingOrgs } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)

    if (existingOrgs && existingOrgs.length > 0) {
      for (const org of existingOrgs) {
        console.log(`🔄 既存組織を削除: ${slug}`)
        // メンバーシップを削除
        await supabase.from('organization_members').delete().eq('organization_id', org.id)
        // 組織を削除
        await supabase.from('organizations').delete().eq('id', org.id)
      }
    }

    // 組織を作成
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
      })
      .select()
      .single()

    if (orgError || !org) {
      console.error('組織作成エラー:', orgError)
      throw orgError
    }

    // オーナーとして追加
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: userId,
        role: 'owner',
      })

    if (memberError) {
      console.error('オーナー追加エラー:', memberError)
      throw memberError
    }

    console.log(`✅ テスト組織作成: ${name} (${slug})`)

    return org
  } catch (error) {
    console.error('❌ テスト組織作成エラー:', error)
    throw error
  }
}
