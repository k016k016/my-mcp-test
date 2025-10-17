// 現在の組織管理
// Cookieで現在選択中の組織を記憶
'use server'

import { cookies } from 'next/headers'

const CURRENT_ORG_COOKIE = 'current_organization_id'

/**
 * 現在の組織IDを取得
 */
export async function getCurrentOrganizationId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(CURRENT_ORG_COOKIE)?.value || null
}

/**
 * 現在の組織IDを設定
 * Next.js 15では、クッキーの設定はServer ActionまたはRoute Handlerでのみ可能
 */
export async function setCurrentOrganizationId(organizationId: string) {
  'use server'
  const cookieStore = await cookies()

  // カスタムクッキードメインが設定されている場合は使用
  const cookieOptions: any = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30日間
    path: '/',
  }

  // クッキードメインを設定（サブドメイン間で共有するため）
  if (process.env.NEXT_PUBLIC_COOKIE_DOMAIN) {
    cookieOptions.domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN
  } else if (process.env.NODE_ENV === 'development') {
    cookieOptions.domain = '.local.test'
  }

  cookieStore.set(CURRENT_ORG_COOKIE, organizationId, cookieOptions)
}

/**
 * 現在の組織IDをクリア
 */
export async function clearCurrentOrganizationId() {
  'use server'
  const cookieStore = await cookies()
  cookieStore.delete(CURRENT_ORG_COOKIE)
}
