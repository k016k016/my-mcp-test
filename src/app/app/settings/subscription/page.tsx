// サブスクリプション管理ページ（APPドメイン）
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentOrganizationId } from '@/lib/organization/current'
import SubscriptionCard from '@/components/SubscriptionCard'

export default async function SubscriptionPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const wwwUrl = process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000'
    redirect(`${wwwUrl}/login`)
  }

  const currentOrgId = await getCurrentOrganizationId()

  if (!currentOrgId) {
    redirect('/onboarding/create-organization')
  }

  // 組織情報を取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', currentOrgId)
    .single()

  // 使用量制限を取得
  const { data: usageLimit } = await supabase
    .from('usage_limits')
    .select('*')
    .eq('plan', organization?.subscription_plan || 'free')
    .single()

  // 現在の使用量を取得（メンバー数など）
  const { data: members, count: memberCount } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', currentOrgId)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">サブスクリプション管理</h1>
        <p className="text-gray-600 mt-2">プランと請求情報を管理します</p>
      </div>

      <SubscriptionCard
        organization={organization}
        usageLimit={usageLimit}
        currentUsage={{
          members: memberCount || 0,
          projects: 0,
          storage_gb: 0,
          api_calls: 0,
        }}
      />
    </div>
  )
}
