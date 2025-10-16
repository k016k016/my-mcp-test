// ログアウト後のリダイレクト処理
'use server'

import { redirect } from 'next/navigation'
import { env } from '@/lib/env'
import { headers } from 'next/headers'
import { getDomainFromHost, DOMAINS } from '@/lib/domains/config'

/**
 * ドメインに応じたログアウト後リダイレクト
 */
export async function redirectAfterLogout() {
  try {
    const headersList = await headers()
    const host = headersList.get('host') || ''
    const domain = getDomainFromHost(host)
    
    // ドメインに応じてリダイレクト先を決定
    switch (domain) {
      case DOMAINS.OPS:
        // OPSドメインの場合はOPSログインページへ
        redirect('/login')
        break
      case DOMAINS.ADMIN:
      case DOMAINS.APP:
        // ADMIN/APPドメインの場合はWWWログインページへ
        redirect(`${env.NEXT_PUBLIC_WWW_URL}/login`)
        break
      case DOMAINS.WWW:
      default:
        // WWWドメインの場合はWWWログインページへ
        redirect(`${env.NEXT_PUBLIC_WWW_URL}/login`)
        break
    }
  } catch (error) {
    console.error('[redirectAfterLogout] Error:', error)
    // エラー時はWWWログインページへ
    redirect(`${env.NEXT_PUBLIC_WWW_URL}/login`)
  }
}
