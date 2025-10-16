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

            // カスタムクッキードメインが設定されている場合（開発・本番共通）
            if (process.env.NEXT_PUBLIC_COOKIE_DOMAIN) {
              cookieOptions.domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN
              cookieOptions.sameSite = 'lax'
              cookieOptions.path = '/'
            }
            // 開発環境でカスタムドメインが未設定の場合はlocalhost.testをデフォルトに
            else if (process.env.NODE_ENV === 'development') {
              cookieOptions.domain = '.localhost.test'
              cookieOptions.sameSite = 'lax'
              cookieOptions.path = '/'
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
