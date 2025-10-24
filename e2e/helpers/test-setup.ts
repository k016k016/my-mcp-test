// E2Eテスト用のセットアップヘルパー
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Supabase Admin Client（テストデータのクリーンアップ用）
// 注意: これはサービスロールキーを使用するため、テスト環境のみで使用
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Supabase環境変数が設定されていません。\n' +
        'NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください。'
    )
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
 * - 固定テストユーザー（ops@, admin@, owner@, member@）も削除
 */
export async function cleanupTestData() {
  const supabase = createAdminClient()

  try {
    console.log('🧹 テストデータをクリーンアップ中...')

    // 固定テストユーザーのメールアドレス
    const fixedTestEmails = [
      'ops@example.com',
      'admin@example.com',
      'owner@example.com',
      'member@example.com',
    ]

    // 1. テスト用プロフィールを取得（test-* パターン + 固定ユーザー）
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .or(`email.like.test-%@example.com,email.in.(${fixedTestEmails.join(',')})`)

    if (profilesError) {
      console.error('プロフィール取得エラー:', profilesError)
      // エラーでも続行（固定ユーザーは別途削除を試みる）
    }

    const userIds = profiles?.map((p) => p.id) || []

    // 2. 認証ユーザーから固定メールアドレスのユーザーも取得
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const fixedAuthUsers =
      authUsers?.users.filter((u) => fixedTestEmails.includes(u.email || '')) || []

    // 認証ユーザーのIDも追加（重複排除）
    const allUserIds = [
      ...new Set([...userIds, ...fixedAuthUsers.map((u) => u.id)]),
    ]

    if (allUserIds.length === 0) {
      console.log('✨ クリーンアップ不要（テストデータなし）')
      return
    }

    console.log(`📧 ${allUserIds.length}件のテストユーザーを削除します`)

    // 3. Wiki関連データを削除（外部キー制約を考慮して最初に削除）
    try {
      const { error: wikiError } = await supabase
        .from('wiki_pages')
        .delete()
        .in('created_by', allUserIds)

      if (wikiError && wikiError.code !== 'PGRST116') {
        console.warn('⚠️  Wiki削除警告:', wikiError.message)
      } else if (!wikiError) {
        console.log('📄 Wikiページを削除しました')
      }
    } catch (error) {
      console.warn('⚠️  Wiki削除でエラー（スキップ）:', error)
    }

    // 4. 組織メンバーシップに関連する組織IDを取得
    const { data: memberOrgs } = await supabase
      .from('organization_members')
      .select('organization_id')
      .in('user_id', allUserIds)

    const orgIds = [...new Set(memberOrgs?.map((o) => o.organization_id) || [])]

    if (orgIds.length > 0) {
      console.log(`🏢 ${orgIds.length}件の組織を削除します`)

      // 4-1. Wiki pages（組織に紐づくもの）を削除
      try {
        await supabase.from('wiki_pages').delete().in('organization_id', orgIds)
      } catch (error) {
        console.warn('⚠️  組織関連Wiki削除でエラー（スキップ）')
      }

      // 4-2. 組織の全メンバーシップを削除
      try {
        await supabase
          .from('organization_members')
          .delete()
          .in('organization_id', orgIds)
        console.log('👥 組織メンバーシップを削除しました')
      } catch (error) {
        console.warn('⚠️  メンバーシップ削除でエラー（スキップ）')
      }

      // 4-3. 組織を削除
      try {
        const { error: orgsError } = await supabase
          .from('organizations')
          .delete()
          .in('id', orgIds)

        if (orgsError && orgsError.code !== 'PGRST116') {
          console.warn('⚠️  組織削除警告:', orgsError.message)
        } else if (!orgsError) {
          console.log('🏢 組織を削除しました')
        }
      } catch (error) {
        console.warn('⚠️  組織削除でエラー（スキップ）')
      }
    }

    // 5. プロフィールを削除
    try {
      const { error: deleteProfilesError } = await supabase
        .from('profiles')
        .delete()
        .in('id', allUserIds)

      if (deleteProfilesError && deleteProfilesError.code !== 'PGRST116') {
        console.warn('⚠️  プロフィール削除警告:', deleteProfilesError.message)
      } else if (!deleteProfilesError) {
        console.log('👤 プロフィールを削除しました')
      }
    } catch (error) {
      console.warn('⚠️  プロフィール削除でエラー（スキップ）')
    }

    // 6. 認証ユーザーを削除（Admin API使用）
    let deletedCount = 0
    for (const userId of allUserIds) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(userId)
        if (error) {
          console.warn(`⚠️  ユーザー ${userId} 削除警告: ${error.message}`)
        } else {
          deletedCount++
        }
      } catch (error) {
        console.warn(`⚠️  ユーザー ${userId} 削除でエラー（スキップ）`)
      }
    }

    console.log(`✅ テストデータのクリーンアップ完了（${deletedCount}/${allUserIds.length}件）`)
  } catch (error) {
    console.error('❌ クリーンアップ中にエラー発生:', error)
    // エラーが起きても処理を続行（テストセットアップを試みる）
    console.log('⚠️  一部のクリーンアップに失敗しましたが、続行します')
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
      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        existingUser.id
      )
      if (deleteError) {
        console.warn(`⚠️  ユーザー削除警告: ${deleteError.message}`)
      }
      // 削除完了を待つ（Supabaseが削除を完全に処理するまで）
      await new Promise((resolve) => setTimeout(resolve, 1000))
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
        full_name: options?.contactName || 'Test User',
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
    // 既存の組織があれば削除（名前で検索）
    const { data: existingOrgs } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', name)

    if (existingOrgs && existingOrgs.length > 0) {
      for (const org of existingOrgs) {
        console.log(`🔄 既存組織を削除: ${name}`)
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
        subscription_plan: 'free',
        subscription_status: 'active',
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
