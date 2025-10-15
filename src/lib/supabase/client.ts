// ブラウザ側で使用するSupabaseクライアント
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        // サブドメイン間でCookieを共有するための設定
        domain:
          process.env.NODE_ENV === 'development'
            ? '.localhost' // 開発環境: *.localhost間で共有
            : process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined, // 本番環境: カスタムドメインまたはデフォルト
      },
    }
  )
}
