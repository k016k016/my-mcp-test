// ドメイン設定
export const DOMAINS = {
  WWW: 'www',
  APP: 'app',
  ADMIN: 'admin',
  OPS: 'ops',
} as const

export type DomainType = (typeof DOMAINS)[keyof typeof DOMAINS]

/**
 * ドメイン設定
 */
export const DOMAIN_CONFIG = {
  [DOMAINS.WWW]: {
    name: 'メインサイト',
    description: '公開Webサイト（マーケティング、ランディングページ）',
    baseUrl: process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000',
    requireAuth: false,
  },
  [DOMAINS.APP]: {
    name: 'アプリケーション',
    description: 'ユーザー向けアプリケーション',
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://app.localhost:3000',
    requireAuth: true,
  },
  [DOMAINS.ADMIN]: {
    name: '管理画面',
    description: '管理者向けダッシュボード',
    baseUrl: process.env.NEXT_PUBLIC_ADMIN_URL || 'http://admin.localhost:3000',
    requireAuth: true,
    requireRole: 'admin',
  },
  [DOMAINS.OPS]: {
    name: '運用画面',
    description: '運用チーム向けツール',
    baseUrl: process.env.NEXT_PUBLIC_OPS_URL || 'http://ops.localhost:3000',
    requireAuth: true,
    requireRole: 'ops',
  },
} as const

/**
 * ホスト名からドメインタイプを取得
 * @returns ドメインタイプ、または未知のサブドメインの場合はnull
 */
export function getDomainFromHost(host: string): DomainType | null {
  // ポート番号を除去
  const hostname = host.split(':')[0]

  // サブドメインを抽出
  if (hostname.includes('app.')) {
    return DOMAINS.APP
  }
  if (hostname.includes('admin.')) {
    return DOMAINS.ADMIN
  }
  if (hostname.includes('ops.')) {
    return DOMAINS.OPS
  }

  // wwwまたはサブドメインなし（example.comやlocalhost）の場合
  if (
    hostname.includes('www.') ||
    hostname === 'localhost' ||
    !hostname.includes('.')
  ) {
    return DOMAINS.WWW
  }

  // ドメイン部分のみの場合（example.com）もWWWとして扱う
  const parts = hostname.split('.')
  if (parts.length === 2) {
    // example.com のようなケース
    return DOMAINS.WWW
  }

  // 未知のサブドメイン
  return null
}

/**
 * 有効なドメインかチェック
 */
export function isValidDomain(host: string): boolean {
  return getDomainFromHost(host) !== null
}

/**
 * ドメイン設定を取得
 */
export function getDomainConfig(domain: DomainType) {
  return DOMAIN_CONFIG[domain]
}

/**
 * 現在のドメインタイプを取得（サーバーサイド用）
 */
export function getCurrentDomain(headers: Headers): DomainType | null {
  const host = headers.get('host') || ''
  return getDomainFromHost(host)
}
