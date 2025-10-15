// Middleware用のSupabaseクライアント
// 認証状態を更新し、セッションを管理します
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // サブドメイン間でCookieを共有するための設定
            const cookieOptions = { ...options }

            // 開発環境: localhost間でCookie共有
            if (process.env.NODE_ENV === 'development') {
              cookieOptions.domain = '.localhost'
            }
            // 本番環境でカスタムドメインを使用する場合
            else if (process.env.NEXT_PUBLIC_COOKIE_DOMAIN) {
              cookieOptions.domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN
            }
            // それ以外（Vercelデフォルトドメイン等）: Supabaseのデフォルト設定を使用

            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, cookieOptions)
          })
        },
      },
    }
  )

  // IMPORTANT: セッションを更新するためにgetUser()を呼び出します
  // supabase.auth.getSession()を使わないでください。これはセッションを更新しません。
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 認証が必要なページの保護（必要に応じて調整）
  // if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
  //   const url = request.nextUrl.clone()
  //   url.pathname = '/login'
  //   return NextResponse.redirect(url)
  // }

  return supabaseResponse
}
