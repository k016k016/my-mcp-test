// 管理画面トップページ（ADMINドメイン）
'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { getCurrentOrganizationId } from '@/lib/organization/current'
import { useEffect, useState } from 'react'

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      // ユーザー認証チェック
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        const wwwUrl = process.env.NEXT_PUBLIC_WWW_URL || 'http://www.local.test:3000'
        window.location.href = `${wwwUrl}/login`
        return
      }

      // 現在の組織IDを取得
      let organizationId = await getCurrentOrganizationId()

      // 組織IDが取得できない場合は、ユーザーの最初の組織を使用
      if (!organizationId) {
        const { data: memberships } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .limit(1)

        if (memberships && memberships.length > 0) {
          organizationId = memberships[0].organization_id
          // Cookieの設定はServer Actionで行う必要があるため、ここでは設定しない
        } else {
          const wwwUrl = process.env.NEXT_PUBLIC_WWW_URL || 'http://www.local.test:3000'
          window.location.href = `${wwwUrl}/onboarding/select-plan`
          return
        }
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
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://app.local.test:3000'
        const q = `?${new URLSearchParams({ error: '管理者権限がありません' })}`;
				// window.location.href = `${appUrl}?error=管理者権限がありません`
				// 例：URLに付与
				window.location.assign(appUrl + '/' + q);
        return
      }

      // 組織情報を取得
      const { data: organization } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single()

      // 自組織のメンバー数を取得
      const { count: membersCount } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .is('deleted_at', null)

      // 自組織の最近のメンバーを取得
      const { data: recentMembers } = await supabase
        .from('organization_members')
        .select(`
          id,
          role,
          created_at,
          profile:profiles (
            email,
            full_name,
            name
          )
        `)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5)

      // 使用量制限を取得
      const { data: usageLimit } = await supabase
        .from('usage_limits')
        .select('*')
        .eq('plan', organization?.subscription_plan || 'free')
        .single()

      setData({
        organization,
        membersCount,
        recentMembers,
        usageLimit,
      })
      setLoading(false)
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const { organization, membersCount, recentMembers, usageLimit } = data

  return (
    <div>
      {/* ヘッダーカード */}
      <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
          組織ダッシュボード
        </h1>
        <p className="text-gray-700 mt-3 text-lg">{organization?.name || '組織'} の管理</p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/members" className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="text-indigo-100 text-sm font-medium">メンバー数</div>
            <svg className="w-6 h-6 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="text-4xl font-bold">{membersCount || 0}</div>
          <div className="text-indigo-100 text-sm mt-2">
            上限: {usageLimit?.max_members === -1 ? '無制限' : usageLimit?.max_members || 3}
          </div>
        </Link>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="text-blue-100 text-sm font-medium">プラン</div>
            <svg className="w-6 h-6 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div className="text-4xl font-bold capitalize">{organization?.subscription_plan || 'free'}</div>
          <div className="text-blue-100 text-sm mt-2">
            {organization?.subscription_status === 'active' ? 'アクティブ' : organization?.subscription_status || '-'}
          </div>
        </div>

        <Link href="/subscription" className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="text-purple-100 text-sm font-medium">ストレージ</div>
            <svg className="w-6 h-6 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <div className="text-4xl font-bold">0 GB</div>
          <div className="text-purple-100 text-sm mt-2">
            上限: {usageLimit?.max_storage_gb === -1 ? '無制限' : `${usageLimit?.max_storage_gb || 1} GB`}
          </div>
        </Link>

        <Link href="/settings" className="bg-gradient-to-br from-pink-500 to-pink-600 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="text-pink-100 text-sm font-medium">組織設定</div>
            <svg className="w-6 h-6 text-pink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold">管理</div>
          <div className="text-pink-100 text-sm mt-2">組織情報・設定</div>
        </Link>
      </div>

      {/* 最近のメンバー */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">最近参加したメンバー</h2>
          <Link href="/members" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            すべて見る →
          </Link>
        </div>
        <div className="p-6">
          {recentMembers && recentMembers.length > 0 ? (
            <div className="space-y-4">
              {recentMembers.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {(member.profile?.full_name || member.profile?.name || member.profile?.email)
                        ?.charAt(0)
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.profile?.full_name || member.profile?.name || '未設定'}
                      </div>
                      <div className="text-sm text-gray-600">{member.profile?.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      {new Date(member.created_at).toLocaleDateString('ja-JP')}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      member.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                      member.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {member.role === 'owner' ? 'オーナー' : member.role === 'admin' ? '管理者' : 'ユーザー'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">メンバーがいません</p>
          )}
        </div>
      </div>
    </div>
  )
}
