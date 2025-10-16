// OPSドメインのトップページ
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isOpsUser } from '@/lib/auth/permissions'
import {
  getSystemStats,
  getAllOrganizations,
  getAllUsers,
  getAuditLogs,
} from '@/app/actions/ops'
import Link from 'next/link'

export default async function OpsPage() {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const opsUrl = process.env.NEXT_PUBLIC_OPS_URL || 'http://ops.localhost:3000'
    redirect(`${opsUrl}/login`)
  }

  // OPS権限チェック
  const hasOpsAccess = await isOpsUser(user)
  if (!hasOpsAccess) {
    const wwwUrl = process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000'
    redirect(`${wwwUrl}/login?error=運用担当者権限が必要です`)
  }

  // システム統計を取得
  const statsResult = await getSystemStats()
  const stats = statsResult.success ? statsResult.stats : null

  // 組織一覧を取得（最新5件）
  const orgsResult = await getAllOrganizations({ limit: 5, offset: 0 })
  const organizations = orgsResult.success ? orgsResult.organizations : []

  // ユーザー一覧を取得（最新5件）
  const usersResult = await getAllUsers({ limit: 5, offset: 0 })
  const users = usersResult.success ? usersResult.users : []

  // 監査ログを取得（最新10件）
  const logsResult = await getAuditLogs({ limit: 10, offset: 0 })
  const auditLogs = logsResult.success ? logsResult.logs : []
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">運用ダッシュボード</h1>
      <p className="text-gray-400 mb-8">
        システム全体の管理・監視ツール
      </p>

      {/* システム統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-2">総組織数</div>
          <div className="text-2xl font-bold">{stats?.organizations ?? 0}</div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-2">総ユーザー数</div>
          <div className="text-2xl font-bold">{stats?.users ?? 0}</div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-2">アクティブサブスクリプション</div>
          <div className="text-2xl font-bold text-green-400">
            {stats?.activeSubscriptions ?? 0}
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-2">本日の監査ログ</div>
          <div className="text-2xl font-bold">{stats?.todayAuditLogs ?? 0}</div>
        </div>
      </div>

      {/* 組織一覧 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 mb-8">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold">組織一覧</h2>
          <Link
            href="/ops/organizations"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            すべて表示 →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-750">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  組織名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  組織ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  プラン
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  作成日
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {organizations.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    組織がありません
                  </td>
                </tr>
              ) : (
                organizations.map((org: any) => (
                  <tr key={org.id} className="hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {org.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {org.slug}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded bg-gray-700">
                        {org.subscription_plan || 'free'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          org.subscription_status === 'active'
                            ? 'bg-green-900 text-green-300'
                            : 'bg-yellow-900 text-yellow-300'
                        }`}
                      >
                        {org.subscription_status || 'trialing'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-sm">
                      {new Date(org.created_at).toLocaleDateString('ja-JP')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ユーザー一覧 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 mb-8">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold">ユーザー一覧</h2>
          <Link
            href="/ops/users"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            すべて表示 →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-750">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  メールアドレス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  名前
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  会社名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  登録日
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    ユーザーがいません
                  </td>
                </tr>
              ) : (
                users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {user.company_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-sm">
                      {new Date(user.created_at).toLocaleDateString('ja-JP')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 監査ログ */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold">監査ログ</h2>
          <Link
            href="/ops/audit-logs"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            すべて表示 →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-750">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  日時
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  アクション
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  ユーザー
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  組織
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  リソース
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {auditLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    監査ログがありません
                  </td>
                </tr>
              ) : (
                auditLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(log.created_at).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded bg-gray-700 font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {log.user?.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {log.organization?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {log.resource_type}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
