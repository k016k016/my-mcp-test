// グローバル404ページ - ドメインごとに異なるデザインを表示
import { headers } from 'next/headers'
import Link from 'next/link'
import { DOMAINS } from '@/lib/domains/config'

export default async function NotFound() {
  const headersList = await headers()
  const domain = headersList.get('x-domain') || DOMAINS.WWW

  // APP ドメインの404
  if (domain === DOMAINS.APP) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center">
                    <div className="text-7xl font-black bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      404
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                    <span className="text-white text-xl">!</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-slate-800 mb-3">
                  お探しのページが見つかりません
                </h1>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  このページは削除されたか、URLが変更された可能性があります。
                  <br className="hidden sm:block" />
                  ダッシュボードから再度アクセスしてください。
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    ダッシュボード
                  </Link>
                  <Link
                    href="/projects"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    プロジェクト
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              問題が解決しない場合は、
              <Link href="/settings" className="text-blue-600 hover:text-blue-700 font-medium ml-1">
                サポートにお問い合わせ
              </Link>
              ください
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ADMIN ドメインの404
  if (domain === DOMAINS.ADMIN) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-purple-200/50 p-12">
            {/* アイコンと404 */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-40 h-40 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl flex items-center justify-center transform rotate-6">
                  <div className="text-8xl font-black bg-gradient-to-br from-purple-600 to-pink-600 bg-clip-text text-transparent transform -rotate-6">
                    404
                  </div>
                </div>
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* メッセージ */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-slate-800 mb-4">
                ページが見つかりません
              </h1>
              <p className="text-lg text-slate-600 mb-2 leading-relaxed">
                お探しのページは存在しないか、移動した可能性があります。
              </p>
              <p className="text-base text-slate-500">
                管理画面のトップページから再度アクセスしてください。
              </p>
            </div>

            {/* アクションボタン */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link
                href="/"
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 text-base font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                管理画面トップ
              </Link>
              <Link
                href="/users"
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 text-base font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all shadow"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                ユーザー一覧
              </Link>
            </div>

            {/* クイックリンク */}
            <div className="pt-6 border-t border-slate-200 text-center">
              <p className="text-sm text-slate-500 mb-3">よく使うページ</p>
              <div className="flex justify-center flex-wrap gap-4">
                <Link href="/organizations" className="text-sm text-purple-600 hover:text-purple-700 font-medium hover:underline">
                  組織管理
                </Link>
                <span className="text-slate-300">•</span>
                <Link href="/settings" className="text-sm text-purple-600 hover:text-purple-700 font-medium hover:underline">
                  設定
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // OPS ドメインの404
  if (domain === DOMAINS.OPS) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-4xl w-full">
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-emerald-500/30 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <div className="text-white font-bold text-lg">⚠️ ALERT: PAGE NOT FOUND</div>
                <div className="ml-auto text-white/80 text-sm font-mono">
                  {new Date().toLocaleString('ja-JP')}
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
                  <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Error Details
                  </h3>
                  <div className="space-y-2 text-sm font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status Code:</span>
                      <span className="text-red-400 font-bold">404</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Error Type:</span>
                      <span className="text-slate-300">Not Found</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Severity:</span>
                      <span className="text-yellow-400">WARNING</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Environment:</span>
                      <span className="text-emerald-400">OPERATIONS</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
                  <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    System Status
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">API Server</span>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                        ● ONLINE
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Database</span>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                        ● ONLINE
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Cache Layer</span>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                        ● ONLINE
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600 mb-6">
                <h2 className="text-2xl font-bold text-white mb-3">
                  リクエストされたリソースが見つかりませんでした
                </h2>
                <p className="text-slate-400 leading-relaxed">
                  指定されたURLは存在しないか、アクセス権限がない可能性があります。
                  運用ダッシュボードから正しいページにアクセスしてください。
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-lg transition-all shadow-lg text-center"
                >
                  🏠 運用ダッシュボード
                </Link>
                <Link
                  href="/monitoring"
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg transition-all text-center"
                >
                  📊 監視画面
                </Link>
                <Link
                  href="/logs"
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg transition-all text-center"
                >
                  📝 ログ確認
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-slate-500 text-sm font-mono">
            OPS-DASHBOARD-v2.0 | Incident ID: {Math.random().toString(36).substring(7).toUpperCase()}
          </div>
        </div>
      </div>
    )
  }

  // WWW ドメインの404（デフォルト）
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <nav className="container mx-auto px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Example App
            </span>
          </Link>
        </nav>
      </header>

      <div className="container mx-auto px-6 py-20 flex items-center justify-center min-h-[80vh]">
        <div className="max-w-4xl w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="relative z-10">
                <div className="text-[180px] leading-none font-black bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent select-none">
                  404
                </div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-400/30 rounded-2xl animate-bounce" style={{animationDelay: '0.2s', animationDuration: '3s'}}></div>
              <div className="absolute bottom-10 left-10 w-16 h-16 bg-purple-400/30 rounded-full animate-bounce" style={{animationDelay: '0.5s', animationDuration: '2.5s'}}></div>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-full mb-6 text-sm font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                ページが見つかりません
              </div>

              <h1 className="text-5xl font-bold text-slate-800 mb-6 leading-tight">
                おっと！
                <br />
                道に迷いましたか？
              </h1>

              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                お探しのページは存在しないか、削除された可能性があります。
                トップページから再度お探しください。
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  トップページへ
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-slate-700 bg-white rounded-xl border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all shadow-lg"
                >
                  無料で始める
                </Link>
              </div>

              <div className="mt-10 pt-8 border-t border-slate-200">
                <p className="text-sm text-slate-500 mb-3">人気のページ</p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/pricing" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                    料金プラン
                  </Link>
                  <span className="text-slate-300">•</span>
                  <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                    ログイン
                  </Link>
                  <span className="text-slate-300">•</span>
                  <Link href="/signup" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                    アカウント作成
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
