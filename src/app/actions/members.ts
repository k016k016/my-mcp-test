// メンバー管理用のServer Actions
'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend/operations'
import { revalidatePath } from 'next/cache'
import type { OrganizationRole } from '@/types/database'

/**
 * メンバーを招待
 */
export async function inviteMember(organizationId: string, email: string, role: OrganizationRole) {
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
    .single()

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return { error: 'メンバーを招待する権限がありません' }
  }

  // 既に招待済みかチェック
  const { data: existingInvitation } = await supabase
    .from('invitations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('email', email)
    .eq('status', 'pending')
    .single()

  if (existingInvitation) {
    return { error: 'このメールアドレスには既に招待を送信しています' }
  }

  // 既にメンバーかチェック
  const { data: existingMember } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (existingMember) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', existingMember.id)
      .single()

    if (membership) {
      return { error: 'このユーザーは既に組織のメンバーです' }
    }
  }

  // 招待トークンを生成
  const token = crypto.randomUUID()

  // 招待を作成
  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .insert({
      organization_id: organizationId,
      email,
      role,
      token,
      invited_by: user.id,
      status: 'pending',
    })
    .select()
    .single()

  if (inviteError) {
    return { error: '招待の作成に失敗しました: ' + inviteError.message }
  }

  // 組織情報を取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single()

  // 招待メールを送信
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'
  const inviteUrl = `${appUrl}/invite/${token}`

  try {
    await sendEmail({
      to: email,
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
    // メール送信失敗時もエラーとする
    await supabase.from('invitations').delete().eq('id', invitation.id)
    return { error: '招待メールの送信に失敗しました' }
  }

  // 監査ログを記録
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    user_id: user.id,
    action: 'member.invited',
    resource_type: 'invitation',
    resource_id: invitation.id,
    details: { email, role },
  })

  revalidatePath('/', 'layout')
  return { success: true, invitation }
}

/**
 * 招待を承認してメンバーに追加
 */
export async function acceptInvitation(token: string) {
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
    .eq('token', token)
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
    return { error: 'メンバーの追加に失敗しました: ' + memberError.message }
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
  await supabase.from('audit_logs').insert({
    organization_id: invitation.organization_id,
    user_id: user.id,
    action: 'member.joined',
    resource_type: 'organization_member',
    resource_id: user.id,
    details: { role: invitation.role },
  })

  revalidatePath('/', 'layout')
  return { success: true, organizationId: invitation.organization_id }
}

/**
 * メンバーのロールを変更
 */
export async function updateMemberRole(
  organizationId: string,
  memberId: string,
  newRole: OrganizationRole
) {
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
    .single()

  if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
    return { error: 'ロールを変更する権限がありません' }
  }

  // 対象メンバーを取得
  const { data: targetMember } = await supabase
    .from('organization_members')
    .select('role, user_id')
    .eq('id', memberId)
    .eq('organization_id', organizationId)
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
    return { error: 'ロールの更新に失敗しました: ' + updateError.message }
  }

  // 監査ログを記録
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    user_id: user.id,
    action: 'member.role_updated',
    resource_type: 'organization_member',
    resource_id: memberId,
    details: { old_role: targetMember.role, new_role: newRole },
  })

  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * メンバーを削除
 */
export async function removeMember(organizationId: string, memberId: string) {
  const supabase = await createClient()

  // 現在のユーザーを取得
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: '認証が必要です' }
  }

  // 対象メンバーを取得
  const { data: targetMember } = await supabase
    .from('organization_members')
    .select('role, user_id')
    .eq('id', memberId)
    .eq('organization_id', organizationId)
    .single()

  if (!targetMember) {
    return { error: 'メンバーが見つかりません' }
  }

  // 自分自身の場合は退出として処理（権限チェック不要）
  if (targetMember.user_id === user.id) {
    // オーナーは退出できない（他のオーナーがいる場合を除く）
    if (targetMember.role === 'owner') {
      return { error: 'オーナーは組織から退出できません。組織を削除するか、他のメンバーをオーナーにしてください。' }
    }
  } else {
    // 他人を削除する場合は管理者権限が必要
    const { data: currentMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
      return { error: 'メンバーを削除する権限がありません' }
    }

    // オーナーを削除することはできない
    if (targetMember.role === 'owner') {
      return { error: 'オーナーを削除することはできません' }
    }
  }

  // メンバーを削除
  const { error: deleteError } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', memberId)

  if (deleteError) {
    return { error: 'メンバーの削除に失敗しました: ' + deleteError.message }
  }

  // 監査ログを記録
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    user_id: user.id,
    action: 'member.removed',
    resource_type: 'organization_member',
    resource_id: memberId,
    details: { removed_user_id: targetMember.user_id },
  })

  revalidatePath('/', 'layout')
  return { success: true }
}
