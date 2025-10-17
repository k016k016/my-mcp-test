// Next.js Middleware - リクエストごとに実行され、認証セッションを更新します
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { getDomainFromHost, DOMAINS, getDomainConfig } from '@/lib/domains/config'
import { createClient } from '@/lib/supabase/server'
import { isOpsUser, hasAdminAccess } from '@/lib/auth/permissions'
import { env } from '@/lib/env'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const domain = getDomainFromHost(host)
  
  console.log('[Middleware] Request to:', host, 'Domain type:', domain, 'Path:', request.nextUrl.pathname)

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
        // NextRequest に ip は無い場合があるため、未取得時は unknown
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
  // 後段でCookieを設定するための一時保持
  let orgIdToSetCookie: string | null = null

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

      console.log('[Middleware] Auth check for domain:', domain, 'User:', user?.id || 'none')

      if (!user) {
        // 未認証: OPSのみ専用ログインへ。APP/ADMINはページ側で処理させる（初回アクセス時のセッション同期のため）
        if (domain === DOMAINS.OPS) {
          return NextResponse.redirect(new URL('/login', (env.NEXT_PUBLIC_OPS_URL || 'http://ops.local.test:3000').trim()))
        }
      } else {
        // 認証済みの場合のみ以下の処理
        // OPSドメインの場合は運用担当者権限チェック
        if (domain === DOMAINS.OPS) {
          const hasOpsAccess = await isOpsUser(user)
          if (!hasOpsAccess) {
            // 運用担当者以外はWWWログインページへ
            const wwwBase = (env.NEXT_PUBLIC_WWW_URL || 'http://www.local.test:3000').trim()
            return NextResponse.redirect(new URL('/login', wwwBase))
          }
        }
      }
      

      // ADMINドメインの権限チェックはページ側で実施
      // （ミドルウェアはEdge環境のため、RLS/権限判定の不整合を避ける目的）
      
      // current_organization_id クッキーが未設定の場合は、ユーザーの最初の組織を後段で設定
      const hasOrgCookie = request.cookies.get('current_organization_id')?.value
      if (!hasOrgCookie) {
        const { data: memberships } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .limit(1)

        const firstOrgId = Array.isArray(memberships) && memberships[0]?.organization_id
        if (firstOrgId) {
          orgIdToSetCookie = firstOrgId
        }
      }
    }
  }

  // Supabaseセッションを更新
  let response = await updateSession(request)

  // 必要であればここでCookieを設定
  if (orgIdToSetCookie) {
    const cookieDomain = (process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.local.test').trim()
    response.cookies.set('current_organization_id', orgIdToSetCookie, {
      domain: cookieDomain,
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
    })
    console.log('[Middleware] Set current_organization_id cookie:', orgIdToSetCookie)
  }

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

  console.log('[Middleware] Rewriting to:', url.pathname)
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
