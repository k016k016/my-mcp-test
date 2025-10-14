// APPドメインのトップページ
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { env } from '@/lib/env'
import { getCurrentOrganizationId, setCurrentOrganizationId } from '@/lib/organization/current'

export default async function AppPage() {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // 未認証の場合はWWWドメインのログインページへ
    redirect(`${env.NEXT_PUBLIC_WWW_URL}/login`)
  }

  // ユーザーが所属する組織を取得
  const { data: memberships } = await supabase
    .from('organization_members')
    .select(
      `
      role,
      organization:organizations (
        id,
        name,
        slug,
        subscription_plan,
        subscription_status,
        trial_ends_at
      )
    `
    )
    .eq('user_id', user.id)

  // 組織が1つもない場合は組織作成ページへ
  if (!memberships || memberships.length === 0) {
    redirect('/onboarding/create-organization')
  }

  // Cookieから最後に選択した組織を取得
  const currentOrgId = await getCurrentOrganizationId()

  // 最後に選択した組織を探す
  let currentMembership = currentOrgId
    ? memberships.find((m) => m.organization && 'id' in m.organization && m.organization.id === currentOrgId)
    : null

  // 見つからない場合は最初の組織を使用
  if (!currentMembership) {
    currentMembership = memberships[0]

    // Cookieに保存
    if (currentMembership.organization && 'id' in currentMembership.organization) {
      await setCurrentOrganizationId(currentMembership.organization.id)
    }
  }

  const currentOrg = currentMembership.organization as any

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">ダッシュボード</h1>
        <p className="text-gray-600 mt-2">{currentOrg.name}</p>
      </div>

      {/* ダッシュボードカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-2">総プロジェクト数</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-2">アクティブタスク</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-2">チームメンバー</div>
          <div className="text-3xl font-bold">{memberships.length}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-2">完了率</div>
          <div className="text-3xl font-bold">-</div>
        </div>
      </div>

      {/* 最近のアクティビティ */}
      <div className="mt-8 bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">最近のアクティビティ</h2>
        </div>
        <div className="p-6">
          <p className="text-gray-600">アクティビティはまだありません</p>
        </div>
      </div>

      {/* トライアル情報 */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-2">🎉 トライアル期間中</h3>
        <p className="text-sm text-blue-800">
          現在、14日間の無料トライアルをご利用中です。全ての機能を無料でお試しいただけます。
        </p>
      </div>
    </div>
  )
}
