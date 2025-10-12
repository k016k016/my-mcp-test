// 管理画面トップページ（ADMINドメイン）
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const wwwUrl = process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000'
    redirect(`${wwwUrl}/login`)
  }

  // 統計情報を取得
  const { count: usersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const { count: orgsCount } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })

  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  const { data: recentOrgs } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">管理ダッシュボード</h1>
        <p className="text-gray-600 mt-2">システム全体の管理と監視</p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/users" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="text-sm text-gray-600 mb-2">総ユーザー数</div>
          <div className="text-3xl font-bold">{usersCount || 0}</div>
        </Link>
        <Link href="/organizations" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="text-sm text-gray-600 mb-2">総組織数</div>
          <div className="text-3xl font-bold">{orgsCount || 0}</div>
        </Link>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-2">有料プラン</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-2">月間収益</div>
          <div className="text-3xl font-bold">¥0</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 最近のユーザー */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold">最近登録されたユーザー</h2>
            <Link href="/users" className="text-sm text-blue-600 hover:text-blue-700">
              すべて見る →
            </Link>
          </div>
          <div className="p-6">
            {recentUsers && recentUsers.length > 0 ? (
              <div className="space-y-4">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{user.full_name || user.email}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">ユーザーがいません</p>
            )}
          </div>
        </div>

        {/* 最近の組織 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold">最近作成された組織</h2>
            <Link href="/organizations" className="text-sm text-blue-600 hover:text-blue-700">
              すべて見る →
            </Link>
          </div>
          <div className="p-6">
            {recentOrgs && recentOrgs.length > 0 ? (
              <div className="space-y-4">
                {recentOrgs.map((org) => (
                  <div key={org.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{org.name}</div>
                      <div className="text-sm text-gray-600">{org.slug}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        {new Date(org.created_at).toLocaleDateString('ja-JP')}
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                        {org.subscription_plan}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">組織がありません</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
