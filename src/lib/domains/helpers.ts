// ドメインルーティングのヘルパー関数
import { headers } from 'next/headers'
import { getDomainFromHost, DOMAINS, getDomainConfig, type DomainType } from './config'

/**
 * 現在のドメインを取得（Server Component用）
 */
export async function getCurrentDomain(): Promise<DomainType | null> {
  const headersList = await headers()
  const host = headersList.get('host') || ''
  return getDomainFromHost(host)
}

/**
 * 現在のドメイン設定を取得
 */
export async function getCurrentDomainConfig() {
  const domain = await getCurrentDomain()
  if (!domain) {
    return null
  }
  return getDomainConfig(domain)
}

/**
 * 指定したドメインのURLを生成
 */
export function getDomainUrl(domain: DomainType, path: string = '/'): string {
  const config = getDomainConfig(domain)
  const url = new URL(config.baseUrl)
  url.pathname = path
  return url.toString()
}

/**
 * 各ドメインのURLを生成
 */
export const domainUrls = {
  www: (path: string = '/') => getDomainUrl(DOMAINS.WWW, path),
  app: (path: string = '/') => getDomainUrl(DOMAINS.APP, path),
  admin: (path: string = '/') => getDomainUrl(DOMAINS.ADMIN, path),
  ops: (path: string = '/') => getDomainUrl(DOMAINS.OPS, path),
}

/**
 * 現在のドメインかチェック
 */
export async function isCurrentDomain(domain: DomainType): Promise<boolean> {
  const currentDomain = await getCurrentDomain()
  if (!currentDomain) {
    return false
  }
  return currentDomain === domain
}

/**
 * WWWドメインかチェック
 */
export async function isWwwDomain(): Promise<boolean> {
  return await isCurrentDomain(DOMAINS.WWW)
}

/**
 * APPドメインかチェック
 */
export async function isAppDomain(): Promise<boolean> {
  return await isCurrentDomain(DOMAINS.APP)
}

/**
 * ADMINドメインかチェック
 */
export async function isAdminDomain(): Promise<boolean> {
  return await isCurrentDomain(DOMAINS.ADMIN)
}

/**
 * OPSドメインかチェック
 */
export async function isOpsDomain(): Promise<boolean> {
  return await isCurrentDomain(DOMAINS.OPS)
}
