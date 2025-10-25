// プロフィール設定ページ
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadProfile()
    loadOrganizations()
  }, [])

  // 成功メッセージの自動非表示（3秒後）
  useEffect(() => {
    if (message?.type === 'success') {
      const timer = setTimeout(() => {
        setMessage(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [message])

  // パスワード変更成功メッセージの自動非表示（3秒後）
  useEffect(() => {
    if (passwordMessage?.type === 'success') {
      const timer = setTimeout(() => {
        setPasswordMessage(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [passwordMessage])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      setFullName(profile.full_name || '')
      setEmail(profile.email || '')
      setCompanyName(profile.company_name || '')
    }
    setLoading(false)
  }

  async function loadOrganizations() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: memberships } = await supabase
      .from('organization_members')
      .select(`
        role,
        organization:organizations (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null)

    if (memberships) {
      setOrganizations(memberships)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    // E2E環境での人工遅延（テスト用）
    let e2eDelayMs = 0
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const cookieMatch = document.cookie.match(/__E2E_FORCE_PENDING_MS__=(\d+)/)
      if (cookieMatch) {
        e2eDelayMs = Number(cookieMatch[1])
        setSaving(true) // ローディング状態ON（処理開始前）
        await new Promise((r) => setTimeout(r, e2eDelayMs))
        // Cookie削除（1回使い切り）
        document.cookie =
          '__E2E_FORCE_PENDING_MS__=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.local.test'
      }
    }

    if (!saving) setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        company_name: companyName,
      })
      .eq('id', user.id)

    // 最小表示時間300msを保証
    if (e2eDelayMs > 0) {
      await new Promise((r) => setTimeout(r, 300))
    }

    if (error) {
      setMessage({ type: 'error', text: '保存に失敗しました: ' + error.message })
    } else {
      setMessage({ type: 'success', text: 'プロフィールを更新しました' })
      router.refresh()
    }
    setSaving(false)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMessage(null)

    // バリデーション
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: '新しいパスワードが一致しません' })
      return
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'パスワードは8文字以上にしてください' })
      return
    }

    // E2E環境での人工遅延（テスト用）
    let e2eDelayMs = 0
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const cookieMatch = document.cookie.match(/__E2E_FORCE_PENDING_MS__=(\d+)/)
      if (cookieMatch) {
        e2eDelayMs = Number(cookieMatch[1])
        setChangingPassword(true) // ローディング状態ON（処理開始前）
        await new Promise((r) => setTimeout(r, e2eDelayMs))
        // Cookie削除（1回使い切り）
        document.cookie =
          '__E2E_FORCE_PENDING_MS__=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.local.test'
      }
    }

    if (!changingPassword) setChangingPassword(true)

    // Supabaseのパスワード変更
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    // 最小表示時間300msを保証
    if (e2eDelayMs > 0) {
      await new Promise((r) => setTimeout(r, 300))
    }

    if (error) {
      setPasswordMessage({ type: 'error', text: 'パスワード変更に失敗しました: ' + error.message })
    } else {
      setPasswordMessage({ type: 'success', text: 'パスワードを変更しました' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    setChangingPassword(false)
  }

  function getRoleLabel(role: string) {
    switch (role) {
      case 'owner': return 'オーナー'
      case 'admin': return '管理者'
      case 'member': return 'ユーザー'
      default: return role
    }
  }

  function getRoleBadgeColor(role: string) {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'admin': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'member': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <p className="text-gray-700">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
          プロフィール設定
        </h1>
        <p className="text-gray-700 mt-3 text-lg">個人情報とアカウント設定を管理します</p>
      </div>

      {/* 基本情報 */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">基本情報</h2>

        {message && (
          <div className={`mb-6 rounded-lg p-4 border ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              disabled
              value={email}
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 sm:text-sm"
            />
            <p className="mt-2 text-xs text-gray-600">
              メールアドレスは変更できません
            </p>
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-semibold text-gray-900 mb-2">
              氏名
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="block w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="山田 太郎"
            />
          </div>

          <div>
            <label htmlFor="companyName" className="block text-sm font-semibold text-gray-900 mb-2">
              会社名
            </label>
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="block w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="株式会社サンプル"
            />
          </div>

          <div className="pt-4 relative">
            {saving && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg z-10"
                data-testid="profile-save-loading"
              >
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>

      {/* パスワード変更 */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">パスワード変更</h2>

        {passwordMessage && (
          <div className={`mb-6 rounded-lg p-4 border ${
            passwordMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium">{passwordMessage.text}</p>
            </div>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-6">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-900 mb-2">
              新しいパスワード
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="block w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="8文字以上"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900 mb-2">
              新しいパスワード（確認）
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="確認のため再入力"
              required
            />
          </div>

          <div className="pt-4 relative">
            {changingPassword && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg z-10"
                data-testid="password-change-loading"
              >
                <svg className="animate-spin h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            <button
              type="submit"
              disabled={changingPassword}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
            >
              {changingPassword ? '変更中...' : 'パスワードを変更'}
            </button>
          </div>
        </form>
      </div>

      {/* 組織と権限 */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">組織と権限</h2>

        {organizations.length === 0 ? (
          <p className="text-gray-600">所属している組織がありません</p>
        ) : (
          <div className="space-y-4">
            {organizations.map((membership: any) => (
              <div key={membership.organization.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">{membership.organization.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">組織ID: {membership.organization.id}</p>
                </div>
                <div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getRoleBadgeColor(membership.role)}`}>
                    {getRoleLabel(membership.role)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
