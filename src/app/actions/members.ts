// メンバー管理用のServer Actions
'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend/operations'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { hasAvailableSeats, getOrganizationLicense } from '@/lib/licenses/helpers'
import type { OrganizationRole } from '@/types/database'
import { env } from '@/lib/env'
import {
  validateData,
  inviteMemberSchema,
  acceptInvitationSchema,
  updateMemberRoleSchema,
  removeMemberSchema,
} from '@/lib/validation'
import { rateLimitInvitation } from '@/lib/rate-limit'

/**
 * リクエストヘッダーからIP/User-Agentを取得
 */
async function getRequestInfo() {
  const headersList = await headers()
  const ipAddress =
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ||
    headersList.get('x-real-ip') ||
    'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'
  return { ipAddress, userAgent }
}

/**
 * メンバーを招待
 * - ローカル環境: メール送信なし、パスワード固定（password123）で直接ユーザー作成
 * - Vercel環境（プレビュー・本番）: メール送信あり、招待URL経由でユーザー登録
 */
export async function inviteMember(organizationId: string, email: string, role: OrganizationRole) {
  try {
    // 入力バリデーション
    const validation = validateData(inviteMemberSchema, { organizationId, email, role })
    if (!validation.success) {
      return { error: validation.error }
    }

    const validatedData = validation.data

    // レート制限チェック（組織ごとに10回/時間）
    const rateLimit = await rateLimitInvitation(organizationId)
    if (!rateLimit.success) {
      return { error: rateLimit.error }
    }

    const supabase = await createClient()

    // 現在のユーザーを取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: '認証が必要です' }
    }

    // 権限チェック（管理者以上）
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return { error: 'メンバーを招待する権限がありません' }
    }

    // B2B: ライセンスの空きをチェック
    const license = await getOrganizationLicense(organizationId)
    if (license) {
      // ライセンスがある場合は、used_seats < total_seatsをチェック
      const hasSeats = await hasAvailableSeats(organizationId)
      if (!hasSeats) {
        return {
          error: `利用可能なシート数を超えています（${license.used_seats}/${license.total_seats}使用中）。追加シートを購入するか、既存メンバーを削除してください。`,
        }
      }
    }

    // 既に招待済みかチェック
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', validatedData.email)
      .eq('status', 'pending')
      .single()

    if (existingInvitation) {
      return { error: 'このメールアドレスには既に招待を送信しています' }
    }

    // 既にメンバーかチェック
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', validatedData.email)
      .single()

    if (existingProfile) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', existingProfile.id)
        .single()

      if (membership) {
        return { error: 'このユーザーは既に組織のメンバーです' }
      }
    }

    // 組織情報を取得
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    // 環境別処理
    // ローカル環境のみメール送信なし、Vercel（プレビュー・本番）はメール送信
    const isLocal = !process.env.VERCEL && process.env.NODE_ENV === 'development'

    if (isLocal) {
      // ローカル環境: メール送信なし、直接ユーザー作成
      console.log('[inviteMember] ローカル環境: 直接ユーザーを作成します（メール送信なし）')

      // Supabase Service Role Clientを使用してユーザーを作成
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!serviceRoleKey) {
        return { error: 'サービスロールキーが設定されていません' }
      }

      const { createClient: createServiceClient } = await import('@supabase/supabase-js')
      const supabaseAdmin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )

      // ユーザーを作成（メール確認なし、固定パスワード）
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: validatedData.email,
        password: 'password123', // 開発環境固定パスワード
        email_confirm: true, // メール確認をスキップ
        user_metadata: {
          invited_to_org: organizationId,
        },
      })

      if (createError || !newUser.user) {
        console.error('[inviteMember] Failed to create user:', createError)
        return { error: 'ユーザーの作成に失敗しました。もう一度お試しください。' }
      }

      // プロフィールは自動的にトリガーで作成されるが、念のため確認
      await new Promise((resolve) => setTimeout(resolve, 500)) // トリガー実行を待つ

      // 組織メンバーとして追加
      const { error: memberError } = await supabase.from('organization_members').insert({
        organization_id: organizationId,
        user_id: newUser.user.id,
        role: validatedData.role,
      })

      if (memberError) {
        console.error('[inviteMember] Failed to add member:', memberError)
        // ユーザー作成は成功したが組織への追加に失敗
        return { error: 'メンバーの追加に失敗しました。もう一度お試しください。' }
      }

      // 監査ログを記録
      const { ipAddress, userAgent } = await getRequestInfo()
      await supabase.from('audit_logs').insert({
        organization_id: organizationId,
        user_id: user.id,
        action: 'member.invited',
        resource_type: 'organization_member',
        resource_id: newUser.user.id,
        details: {
          email: validatedData.email,
          role: validatedData.role,
          method: 'direct_creation',
          password: 'password123',
        },
        ip_address: ipAddress,
        user_agent: userAgent,
      })

      revalidatePath('/', 'layout')
      return {
        success: true,
        message: `${validatedData.email} を組織に追加しました。パスワードは「password123」です。`,
        credentials: {
          email: validatedData.email,
          password: 'password123',
        },
      }
    } else {
      // Vercel環境（プレビュー・本番）: メール送信
      console.log('[inviteMember] Vercel環境: 招待メールを送信します')

      // 招待トークンを生成
      const token = crypto.randomUUID()

      // 招待を作成
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .insert({
          organization_id: organizationId,
          email: validatedData.email,
          role: validatedData.role,
          token,
          invited_by: user.id,
          status: 'pending',
        })
        .select()
        .single()

      if (inviteError) {
        console.error('[inviteMember] Failed to create invitation:', inviteError)
        return { error: '招待の作成に失敗しました。もう一度お試しください。' }
      }

      // 招待メールを送信
      const inviteUrl = `${env.NEXT_PUBLIC_APP_URL}/invite/${token}`

      try {
        await sendEmail({
          to: validatedData.email,
          subject: `${organization?.name || '組織'}への招待`,
          html: `
            <h1>${organization?.name || '組織'}への招待</h1>
            <p>あなたは${organization?.name || '組織'}に${role === 'admin' ? '管理者' : 'メンバー'}として招待されました。</p>
            <p>以下のリンクをクリックして参加してください：</p>
            <a href="${inviteUrl}">${inviteUrl}</a>
            <p>この招待は7日間有効です。</p>
          `,
        })
      } catch (emailError) {
        console.error('[inviteMember] Failed to send email:', emailError)
        // メール送信失敗時は招待を削除
        await supabase.from('invitations').delete().eq('id', invitation.id)
        return { error: '招待メールの送信に失敗しました。もう一度お試しください。' }
      }

      // 監査ログを記録
      const { ipAddress, userAgent } = await getRequestInfo()
      await supabase.from('audit_logs').insert({
        organization_id: organizationId,
        user_id: user.id,
        action: 'member.invited',
        resource_type: 'invitation',
        resource_id: invitation.id,
        details: { email: validatedData.email, role: validatedData.role, method: 'email_invitation' },
        ip_address: ipAddress,
        user_agent: userAgent,
      })

      revalidatePath('/', 'layout')
      return { success: true, invitation }
    }
  } catch (error) {
    console.error('[inviteMember] Unexpected error:', error)
    return { error: '予期しないエラーが発生しました。もう一度お試しください。' }
  }
}

/**
 * 招待を承認してメンバーに追加
 */
export async function acceptInvitation(token: string) {
  try {
    // 入力バリデーション
    const validation = validateData(acceptInvitationSchema, { token })
    if (!validation.success) {
      return { error: validation.error }
    }

    const supabase = await createClient()

    // 現在のユーザーを取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: '認証が必要です。ログインしてから再度お試しください。' }
    }

    // 招待情報を取得
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', validation.data.token)
      .eq('status', 'pending')
      .single()

    if (inviteError || !invitation) {
      return { error: '招待が見つかりません、または既に使用されています' }
    }

    // 有効期限チェック
    if (new Date(invitation.expires_at) < new Date()) {
      return { error: '招待の有効期限が切れています' }
    }

    // ユーザーのプロフィールを取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    // メールアドレスが一致するかチェック
    if (profile?.email !== invitation.email) {
      return {
        error: `この招待は ${invitation.email} 宛てです。正しいアカウントでログインしてください。`,
      }
    }

    // 既にメンバーかチェック
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', invitation.organization_id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      return { error: '既に組織のメンバーです' }
    }

    // メンバーとして追加
    const { error: memberError } = await supabase.from('organization_members').insert({
      organization_id: invitation.organization_id,
      user_id: user.id,
      role: invitation.role,
    })

    if (memberError) {
      console.error('[acceptInvitation] Failed to add member:', memberError)
      return { error: 'メンバーの追加に失敗しました。もう一度お試しください。' }
    }

    // 招待を承認済みに更新
    await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)

    // 監査ログを記録
    const { ipAddress, userAgent } = await getRequestInfo()
    await supabase.from('audit_logs').insert({
      organization_id: invitation.organization_id,
      user_id: user.id,
      action: 'member.joined',
      resource_type: 'organization_member',
      resource_id: user.id,
      details: { role: invitation.role },
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    revalidatePath('/', 'layout')
    return { success: true, organizationId: invitation.organization_id }
  } catch (error) {
    console.error('[acceptInvitation] Unexpected error:', error)
    return { error: '予期しないエラーが発生しました。もう一度お試しください。' }
  }
}

/**
 * メンバーのロールを変更
 */
export async function updateMemberRole(
  organizationId: string,
  memberId: string,
  newRole: OrganizationRole
) {
  try {
    // 入力バリデーション
    const validation = validateData(updateMemberRoleSchema, { organizationId, memberId, newRole })
    if (!validation.success) {
      return { error: validation.error }
    }

    const supabase = await createClient()

    // 現在のユーザーを取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: '認証が必要です' }
    }

    // 権限チェック（管理者以上）
    const { data: currentMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
      return { error: 'ロールを変更する権限がありません' }
    }

    // 対象メンバーを取得（削除済みを除外）
    const { data: targetMember } = await supabase
      .from('organization_members')
      .select('role, user_id')
      .eq('id', memberId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .single()

    if (!targetMember) {
      return { error: 'メンバーが見つかりません' }
    }

    // オーナーを変更する場合は、自分がオーナーでなければならない
    if (newRole === 'owner' && currentMember.role !== 'owner') {
      return { error: 'オーナーのみが新しいオーナーを指定できます' }
    }

    // 自分自身のオーナーロールは変更できない
    if (targetMember.user_id === user.id && targetMember.role === 'owner') {
      return { error: 'オーナーは自分自身のロールを変更できません' }
    }

    // ロールを更新
    const { error: updateError } = await supabase
      .from('organization_members')
      .update({ role: newRole })
      .eq('id', memberId)

    if (updateError) {
      console.error('[updateMemberRole] Failed to update role:', updateError)
      return { error: 'ロールの更新に失敗しました。もう一度お試しください。' }
    }

    // 監査ログを記録
    const { ipAddress, userAgent } = await getRequestInfo()
    await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      user_id: user.id,
      action: 'member.role_updated',
      resource_type: 'organization_member',
      resource_id: memberId,
      details: { old_role: targetMember.role, new_role: newRole },
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    console.error('[updateMemberRole] Unexpected error:', error)
    return { error: '予期しないエラーが発生しました。もう一度お試しください。' }
  }
}

/**
 * メンバーを削除
 */
export async function removeMember(organizationId: string, memberId: string) {
  try {
    // 入力バリデーション
    const validation = validateData(removeMemberSchema, { organizationId, memberId })
    if (!validation.success) {
      return { error: validation.error }
    }

    const supabase = await createClient()

    // 現在のユーザーを取得
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: '認証が必要です' }
    }

    // 対象メンバーを取得（削除済みを除外）
    const { data: targetMember } = await supabase
      .from('organization_members')
      .select('role, user_id')
      .eq('id', memberId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .single()

    if (!targetMember) {
      return { error: 'メンバーが見つかりません' }
    }

    // 自分自身の場合は退出として処理（権限チェック不要）
    if (targetMember.user_id === user.id) {
      // オーナーは退出できない（他のオーナーがいる場合を除く）
      if (targetMember.role === 'owner') {
        return {
          error:
            'オーナーは組織から退出できません。組織を削除するか、他のメンバーをオーナーにしてください。',
        }
      }
    } else {
      // 他人を削除する場合は管理者権限が必要
      const { data: currentMember } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single()

      if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
        return { error: 'メンバーを削除する権限がありません' }
      }

      // オーナーを削除することはできない
      if (targetMember.role === 'owner') {
        return { error: 'オーナーを削除することはできません' }
      }
    }

    // メンバーを論理削除（deleted_atを設定）
    const { error: deleteError } = await supabase
      .from('organization_members')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', memberId)

    if (deleteError) {
      console.error('[removeMember] Failed to remove member:', deleteError)
      return { error: 'メンバーの削除に失敗しました。もう一度お試しください。' }
    }

    // 監査ログを記録
    const { ipAddress, userAgent } = await getRequestInfo()
    await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      user_id: user.id,
      action: 'member.removed',
      resource_type: 'organization_member',
      resource_id: memberId,
      details: { removed_user_id: targetMember.user_id },
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    console.error('[removeMember] Unexpected error:', error)
    return { error: '予期しないエラーが発生しました。もう一度お試しください。' }
  }
}
