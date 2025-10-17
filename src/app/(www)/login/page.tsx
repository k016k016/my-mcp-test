// ログインページ（WWWドメイン）
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRedirectUrlForUser } from '@/lib/auth/permissions'
import LoginForm from '@/components/LoginForm'

export default async function LoginPage() {
  const supabase = await createClient()

  // 既にログインしているかチェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ログイン済みの場合は権限に応じたページにリダイレクト
  if (user) {
    console.log('[Login Page] User already logged in:', user.id)
    const redirectUrl = await getRedirectUrlForUser(user)
    console.log('[Login Page] Redirecting to:', redirectUrl)
    redirect(redirectUrl)
  }

  // 未ログインの場合はログインフォームを表示
  return <LoginForm />
}
