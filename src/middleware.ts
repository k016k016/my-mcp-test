// Next.js Middleware - リクエストごとに実行され、認証セッションを更新します
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { getDomainFromHost, DOMAINS, getDomainConfig } from '@/lib/domains/config'
import { createClient } from '@/lib/supabase/server'
import { isOpsUser, hasAdminAccess } from '@/lib/auth/permissions'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const domain = getDomainFromHost(host)

  // 未知のサブドメインの場合は404エラーを返す
  if (domain === null) {
    return new NextResponse('Not Found: Unknown subdomain', { status: 404 })
  }

  const domainConfig = getDomainConfig(domain)

  // OPSドメインの場合はIP制限をチェック
  if (domain === DOMAINS.OPS) {
    const allowedIpsEnv = process.env.OPS_ALLOWED_IPS?.trim()
    const allowedIps = allowedIpsEnv ? allowedIpsEnv.split(',').map(ip => ip.trim()) : []

    // 許可IPリストが設定されている場合のみチェック
    if (allowedIps.length > 0 && allowedIps[0] !== '') {
      // クライアントIPを取得（プロキシ経由の場合も考慮）
      const clientIp =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        request.ip ||
        'unknown'

      // IPが許可リストに含まれていない場合は403エラー
      if (!allowedIps.includes(clientIp) && clientIp !== 'unknown') {
        return new NextResponse('Access Denied: IP not allowed', { status: 403 })
      }

      // ローカル開発環境の場合は警告ログのみ
      if (clientIp === 'unknown' && process.env.NODE_ENV === 'development') {
        console.warn('⚠️ OPS domain accessed but IP could not be determined (development mode)')
      }
    }
  }

  // 認証が必要なドメインの認証チェック
  if (domain === DOMAINS.APP || domain === DOMAINS.ADMIN || domain === DOMAINS.OPS) {
    // ログインページとauthコールバックは認証チェックをスキップ
    const isLoginPage = request.nextUrl.pathname === '/login'
    const isAuthCallback = request.nextUrl.pathname.startsWith('/auth/')
    
    if (!isLoginPage && !isAuthCallback) {
      // 認証チェック（簡易版）
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        // 未認証の場合は適切なログインページへリダイレクト
        const loginUrl = domain === DOMAINS.OPS ? '/login' : `${process.env.NEXT_PUBLIC_WWW_URL}/login`
        return NextResponse.redirect(new URL(loginUrl, request.url))
      }

      // OPSドメインの場合は運用担当者権限チェック
      if (domain === DOMAINS.OPS) {
        const hasOpsAccess = await isOpsUser(user)
        if (!hasOpsAccess) {
          // 運用担当者以外はWWWログインページへ
          const wwwUrl = process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000'
          return NextResponse.redirect(`${wwwUrl}/login`)
        }
      }

      // ADMINドメインの場合は管理者権限チェック
      if (domain === DOMAINS.ADMIN) {
        const hasAdminPermission = await hasAdminAccess(user)
        if (!hasAdminPermission) {
          // 管理者権限がない場合はAPP画面へ
					// OK
					const appBase = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'
					const to = new URL('/', appBase)
					to.searchParams.set('message', '管理者権限がありません')
					return NextResponse.redirect(to)
          // const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000'
          // return NextResponse.redirect(`${appUrl}?message=管理者権限がありません`)
        }
      }
    }
  }

  // Supabaseセッションを更新
  let response = await updateSession(request)

  // リライト処理：各ドメインを対応するフォルダにマッピング
  const url = request.nextUrl.clone()

  // ドメインごとのパスにリライト
  switch (domain) {
    case DOMAINS.WWW:
      // wwwは/(www)フォルダに
      url.pathname = `/www${url.pathname}`
      break
    case DOMAINS.APP:
      // appは/(app)フォルダに
      url.pathname = `/app${url.pathname}`
      break
    case DOMAINS.ADMIN:
      // adminは/(admin)フォルダに
      url.pathname = `/admin${url.pathname}`
      break
    case DOMAINS.OPS:
      // opsは/(ops)フォルダに
      url.pathname = `/ops${url.pathname}`
      break
  }

  response = NextResponse.rewrite(url, response)

  // カスタムヘッダーでドメイン情報を追加
  response.headers.set('x-domain', domain)
  // 元のパス情報を追加（レイアウトでパス判定に使用）
  response.headers.set('x-invoke-path', request.nextUrl.pathname)

  return response
}

export const config = {
  matcher: [
    /*
     * 以下で始まるパス以外の全てのリクエストパスにマッチします:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化ファイル)
     * - favicon.ico (faviconファイル)
     * - 拡張子を持つファイル (例: .svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
