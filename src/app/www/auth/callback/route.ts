// 認証コールバック（WWWドメイン）
// メール確認などのリダイレクト処理
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
      // 既存ユーザーはAPPドメインへ（仕様上、組織未所属は存在しない）
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'
      return NextResponse.redirect(`${appUrl}${next}`)
    }
  }

  // エラー時はログインページにリダイレクト
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
