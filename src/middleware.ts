// Next.js Middleware - リクエストごとに実行され、認証セッションを更新します
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { getDomainFromHost, DOMAINS, getDomainConfig } from '@/lib/domains/config'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const domain = getDomainFromHost(host)

  // 未知のサブドメインの場合は404エラーページにリダイレクト
  if (domain === null) {
    const url = request.nextUrl.clone()
    url.pathname = '/404'
    return NextResponse.rewrite(url)
  }

  const domainConfig = getDomainConfig(domain)

  // OPSドメインの場合はIP制限をチェック
  if (domain === DOMAINS.OPS) {
    const allowedIps = process.env.OPS_ALLOWED_IPS?.split(',').map(ip => ip.trim()) || []

    // 許可IPリストが設定されている場合のみチェック
    if (allowedIps.length > 0) {
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
