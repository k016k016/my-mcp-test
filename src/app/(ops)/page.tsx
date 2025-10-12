// OPSドメインのトップページ
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function OpsPage() {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const wwwUrl = process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000'
    redirect(`${wwwUrl}/login`)
  }
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">運用ダッシュボード</h1>
      <p className="text-gray-400 mb-8">
        運用チーム向けツール（ops.example.com）
      </p>

      {/* システムステータス */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-2">システムステータス</div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div className="text-xl font-bold text-green-400">正常</div>
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-2">稼働時間</div>
          <div className="text-2xl font-bold">99.98%</div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-2">リクエスト/秒</div>
          <div className="text-2xl font-bold">1,234</div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-2">エラー率</div>
          <div className="text-2xl font-bold text-green-400">0.01%</div>
        </div>
      </div>

      {/* サービスステータス */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 mb-8">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold">サービスステータス</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>API Server</span>
            </div>
            <span className="text-green-400">稼働中</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Database</span>
            </div>
            <span className="text-green-400">稼働中</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Redis Cache</span>
            </div>
            <span className="text-green-400">稼働中</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>Background Jobs</span>
            </div>
            <span className="text-yellow-400">処理中 (Queue: 23)</span>
          </div>
        </div>
      </div>

      {/* 最近のデプロイ */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold">最近のデプロイ</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-750">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  バージョン
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  デプロイ日時
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  デプロイ者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  ステータス
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap font-mono">v1.2.3</td>
                <td className="px-6 py-4 whitespace-nowrap">2025-01-15 14:30</td>
                <td className="px-6 py-4 whitespace-nowrap">ops-team</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900 text-green-300">
                    成功
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
