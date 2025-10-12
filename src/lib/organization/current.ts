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
 */
export async function setCurrentOrganizationId(organizationId: string) {
  const cookieStore = await cookies()
  cookieStore.set(CURRENT_ORG_COOKIE, organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30日間
  })
}

/**
 * 現在の組織IDをクリア
 */
export async function clearCurrentOrganizationId() {
  const cookieStore = await cookies()
  cookieStore.delete(CURRENT_ORG_COOKIE)
}
