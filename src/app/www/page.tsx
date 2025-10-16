// WWWドメインのトップページ
import Link from 'next/link'

export default function WwwPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Example App
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/pricing" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
                料金
              </Link>
              <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
                ログイン
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
              >
                無料で始める
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* ヒーローセクション */}
      <section className="container mx-auto px-6 py-20 lg:py-32">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-8">
            <span className="text-sm font-semibold text-blue-600">🎉 14日間無料トライアル実施中</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight">
            ビジネスを加速する
            <br />
            次世代プラットフォーム
          </h1>
          <p className="text-xl lg:text-2xl text-slate-600 mb-10 leading-relaxed">
            マーケティング、営業、カスタマーサポートを一元管理。
            <br className="hidden sm:block" />
            チームの生産性を最大化し、成長を実現します。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
            >
              無料で始める →
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-slate-700 bg-white/80 backdrop-blur-sm border-2 border-slate-300 rounded-xl hover:bg-white hover:border-slate-400 shadow-lg transition-all"
            >
              料金を見る
            </Link>
          </div>
          <p className="text-sm text-slate-500 mt-6">クレジットカード不要・いつでもキャンセル可能</p>
        </div>
      </section>

      {/* 統計セクション */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              10K+
            </div>
            <div className="text-slate-600 font-medium">利用企業</div>
          </div>
          <div className="text-center">
            <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              99.9%
            </div>
            <div className="text-slate-600 font-medium">稼働率</div>
          </div>
          <div className="text-center">
            <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
              50M+
            </div>
            <div className="text-slate-600 font-medium">処理データ</div>
          </div>
          <div className="text-center">
            <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
              24/7
            </div>
            <div className="text-slate-600 font-medium">サポート</div>
          </div>
        </div>
      </section>

      {/* 機能紹介 */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-800 mb-4">
            必要な機能がすべて揃っています
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            現代のビジネスに必要なツールを、一つのプラットフォームで
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* 機能カード1 */}
          <div className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/20 hover:shadow-2xl transition-all transform hover:scale-105">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">高速パフォーマンス</h3>
            <p className="text-slate-600 leading-relaxed">
              最新のテクノロジーで実現する、ミリ秒単位の応答速度。ストレスフリーな操作体験を提供します。
            </p>
          </div>

          {/* 機能カード2 */}
          <div className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/20 hover:shadow-2xl transition-all transform hover:scale-105">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">エンタープライズセキュリティ</h3>
            <p className="text-slate-600 leading-relaxed">
              SOC2準拠、エンドツーエンド暗号化、多要素認証。大企業も信頼するセキュリティ基準。
            </p>
          </div>

          {/* 機能カード3 */}
          <div className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/20 hover:shadow-2xl transition-all transform hover:scale-105">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">無限のスケーラビリティ</h3>
            <p className="text-slate-600 leading-relaxed">
              スタートアップから大企業まで。ビジネスの成長に合わせて柔軟にスケール可能です。
            </p>
          </div>

          {/* 機能カード4 */}
          <div className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/20 hover:shadow-2xl transition-all transform hover:scale-105">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">リアルタイム分析</h3>
            <p className="text-slate-600 leading-relaxed">
              データドリブンな意思決定を支援。直感的なダッシュボードでビジネスを可視化します。
            </p>
          </div>

          {/* 機能カード5 */}
          <div className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/20 hover:shadow-2xl transition-all transform hover:scale-105">
            <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">チームコラボレーション</h3>
            <p className="text-slate-600 leading-relaxed">
              リアルタイム共同編集、コメント機能、通知システム。チームワークを最大化します。
            </p>
          </div>

          {/* 機能カード6 */}
          <div className="group bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/20 hover:shadow-2xl transition-all transform hover:scale-105">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">API & 連携</h3>
            <p className="text-slate-600 leading-relaxed">
              豊富なAPI、Webhook、1000以上のサードパーティツールとの連携。既存ワークフローに統合。
            </p>
          </div>
        </div>
      </section>

      {/* CTAセクション */}
      <section className="container mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl shadow-2xl p-12 lg:p-20 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            今すぐ始めましょう
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            14日間の無料トライアルで、すべての機能をお試しいただけます。
            <br />
            クレジットカードの登録は不要です。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-10 py-4 text-lg font-semibold text-blue-600 bg-white rounded-xl hover:bg-blue-50 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
            >
              無料で始める →
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-10 py-4 text-lg font-semibold text-white bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-xl hover:bg-white/20 transition-all"
            >
              ログイン
            </Link>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg font-bold">Example App</span>
            </div>
            <div className="text-slate-400 text-sm">
              © 2025 Example App. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
