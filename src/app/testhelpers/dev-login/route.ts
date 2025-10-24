import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * E2Eテスト専用の擬似認証エンドポイント
 *
 * このエンドポイントは開発環境・E2E環境でのみ動作し、
 * サインアップ直後のセッション同期問題を回避するために使用されます。
 *
 * セキュリティ:
 * - 本番環境では完全に無効化
 * - E2E環境フラグが必要
 * - シークレットトークンによる認証
 */
export async function POST(req: Request) {
  // 環境ガード: 本番環境では404を返す
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 })
  }

  // E2E環境フラグチェック
  if (process.env.NEXT_PUBLIC_E2E !== '1') {
    return new Response('Not found', { status: 404 })
  }

  // シークレット検証
  try {
    const body = await req.json()
    const { secret } = body

    if (!secret || secret !== process.env.TEST_HELPER_SECRET) {
      console.warn('[dev-login] Invalid or missing secret')
      return new Response('Forbidden', { status: 403 })
    }
  } catch (error) {
    console.error('[dev-login] Failed to parse request body:', error)
    return new Response('Bad Request', { status: 400 })
  }

  // E2E専用の擬似認証Cookieを設定
  const cookieStore = await cookies()
  cookieStore.set({
    name: 'e2e_auth',
    value: '1',
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : '.local.test',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 30, // 30分
  })

  console.log('[dev-login] E2E auth cookie set successfully')

  return NextResponse.json({ ok: true })
}
