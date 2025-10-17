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
  const [contactName, setContactName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
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
      setContactName(profile.name || '')
      setAvatarUrl(profile.avatar_url || '')
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
    setSaving(true)
    setMessage(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        company_name: companyName,
        name: contactName,
        avatar_url: avatarUrl,
      })
      .eq('id', user.id)

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

    setChangingPassword(true)

    // Supabaseのパスワード変更
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

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

          <div>
            <label htmlFor="contactName" className="block text-sm font-semibold text-gray-900 mb-2">
              担当者名
            </label>
            <input
              id="contactName"
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="block w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="山田 太郎"
            />
          </div>

          <div>
            <label htmlFor="avatarUrl" className="block text-sm font-semibold text-gray-900 mb-2">
              アバターURL
            </label>
            <input
              id="avatarUrl"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="block w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="https://example.com/avatar.jpg"
            />
            <p className="mt-2 text-xs text-gray-600">
              プロフィール画像のURLを入力してください
            </p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
            >
              {saving ? '保存中...' : '変更を保存'}
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
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="確認のため再入力"
              required
            />
          </div>

          <div className="pt-4">
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
