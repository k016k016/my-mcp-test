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

              // 開発環境: localhost間でCookie共有
              if (process.env.NODE_ENV === 'development') {
                cookieOptions.domain = '.localhost'
              }
              // 本番環境でカスタムドメインを使用する場合
              else if (process.env.NEXT_PUBLIC_COOKIE_DOMAIN) {
                cookieOptions.domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN
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
