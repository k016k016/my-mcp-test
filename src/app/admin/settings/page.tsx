// 組織設定ページ（ADMINドメイン）
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentOrganizationId } from '@/lib/organization/current'
import OrganizationSettingsForm from '@/components/OrganizationSettingsForm'
import { env } from '@/lib/env'

export default async function OrganizationSettingsPage() {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const wwwBase = (env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000').trim()
    redirect(new URL('/login', wwwBase).toString())
  }

  // 現在の組織IDを取得
  const organizationId = await getCurrentOrganizationId()

  if (!organizationId) {
    // 想定外フォールバック
    redirect(env.NEXT_PUBLIC_WWW_URL)
  }

  // 権限チェック（オーナーまたは管理者）
  const { data: currentMember } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  const isAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin'

  if (!isAdmin) {
    const appBase = (env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000').trim()
    const to = new URL('/', appBase)
    to.searchParams.set('error', '管理者権限がありません')
    redirect(to.toString())
  }

  // 組織情報を取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single()

  if (!organization) {
    redirect('/')
  }

  return (
    <div className="max-w-4xl">
      {/* ヘッダーカード */}
      <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
          組織設定
        </h1>
        <p className="text-gray-700 mt-3 text-lg">組織の基本情報を管理します</p>
      </div>

      {/* 設定フォーム */}
      <OrganizationSettingsForm organization={organization} />
    </div>
  )
}
