// サーバーサイド（Server Components、Server Actions、Route Handlers）で使用するSupabaseクライアント
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
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

              cookieStore.set(name, value, cookieOptions)
            })
          } catch (error) {
            // Server Componentからset()を呼ぶとエラーになる場合があります
            // Middlewareで処理されるため、ここでは無視します
          }
        },
      },
    }
  )
}
