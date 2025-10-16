// ログインページ（WWWドメイン）
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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
    const redirectUrl = await getRedirectUrlForUser(user)
    redirect(redirectUrl)
  }

  // 未ログインの場合はログインフォームを表示
  return <LoginForm />
}
