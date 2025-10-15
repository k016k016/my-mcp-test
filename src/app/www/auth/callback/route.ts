// 認証コールバック（WWWドメイン）
// OAuth、メール確認などのリダイレクト処理
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'

  if (code) {
    const supabase = await createClient()

    // 認証コードをセッションに交換
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // ユーザーが組織に所属しているかチェック
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', data.user.id)
        .limit(1)

      // 組織に所属していない場合はプラン選択ページへ（B2B新規ユーザー）
      if (!memberships || memberships.length === 0) {
        return NextResponse.redirect(new URL('/onboarding/select-plan', requestUrl.origin))
      }

      // 既存ユーザーはAPPドメインへ
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'
      return NextResponse.redirect(`${appUrl}${next}`)
    }
  }

  // エラー時はログインページにリダイレクト
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
