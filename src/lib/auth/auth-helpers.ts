// 認証関連のユーティリティ関数
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * 現在のユーザーを取得
 * 認証されていない場合はnullを返す
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * 現在のセッションを取得
 * 認証されていない場合はnullを返す
 */
export async function getCurrentSession() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

/**
 * 認証が必要なページで使用
 * ログインしていない場合は指定のページにリダイレクト
 */
export async function requireAuth(redirectTo: string = '/login') {
  const user = await getCurrentUser()
  if (!user) {
    redirect(redirectTo)
  }
  return user
}

/**
 * ログアウト済みであることを確認
 * ログイン済みの場合は指定のページにリダイレクト
 */
export async function requireGuest(redirectTo: string = '/') {
  const user = await getCurrentUser()
  if (user) {
    redirect(redirectTo)
  }
}
