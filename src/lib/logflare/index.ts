/**
 * Logflare Logger
 *
 * アプリケーション全体でログを記録するための統一されたロガー。
 * サーバーサイド・クライアントサイドの両方で使用可能。
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogMetadata {
  userId?: string
  organizationId?: string
  action?: string
  duration?: number
  path?: string
  method?: string
  status?: number
  error?: string
  stack?: string
  [key: string]: any
}

class Logger {
  private apiKey: string | undefined
  private sourceId: string | undefined
  private isProduction: boolean

  constructor() {
    // 環境変数から設定を読み込み
    this.apiKey = process.env.NEXT_PUBLIC_LOGFLARE_API_KEY
    this.sourceId = process.env.NEXT_PUBLIC_LOGFLARE_SOURCE_ID
    this.isProduction = process.env.NEXT_PUBLIC_ENV === 'production'
  }

  /**
   * Logflareにログを送信
   */
  private async send(level: LogLevel, message: string, metadata?: LogMetadata) {
    const logData = {
      message,
      level,
      metadata: {
        ...metadata,
        env: process.env.NEXT_PUBLIC_ENV || 'development',
        timestamp: new Date().toISOString(),
      },
    }

    // 開発環境では常にコンソールに出力
    if (!this.isProduction) {
      const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
      consoleMethod(`[${level.toUpperCase()}]`, message, metadata || '')
    }

    // Logflareが設定されていない場合は送信しない
    if (!this.apiKey || !this.sourceId) {
      if (!this.isProduction) {
        console.warn('[Logflare] APIキーまたはSource IDが設定されていません')
      }
      return
    }

    // Logflareに送信
    try {
      const response = await fetch(
        `https://api.logflare.app/logs/json?api_key=${this.apiKey}&source=${this.sourceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(logData),
        }
      )

      if (!response.ok) {
        throw new Error(`Logflare API error: ${response.status}`)
      }
    } catch (error) {
      // Logflare送信エラーはアプリケーションに影響を与えないようにする
      if (!this.isProduction) {
        console.error('[Logflare] ログ送信失敗:', error)
      }
    }
  }

  /**
   * デバッグレベルのログ
   */
  debug(message: string, metadata?: LogMetadata) {
    return this.send('debug', message, metadata)
  }

  /**
   * 情報レベルのログ
   */
  info(message: string, metadata?: LogMetadata) {
    return this.send('info', message, metadata)
  }

  /**
   * 警告レベルのログ
   */
  warn(message: string, metadata?: LogMetadata) {
    return this.send('warn', message, metadata)
  }

  /**
   * エラーレベルのログ
   */
  error(message: string, errorOrMetadata?: Error | LogMetadata, additionalMetadata?: LogMetadata) {
    let metadata: LogMetadata = {}

    if (errorOrMetadata instanceof Error) {
      metadata = {
        error: errorOrMetadata.message,
        stack: errorOrMetadata.stack,
        ...additionalMetadata,
      }
    } else {
      metadata = errorOrMetadata || {}
    }

    return this.send('error', message, metadata)
  }

  /**
   * 監査ログ（重要なユーザーアクション）
   */
  async audit(action: string, metadata: LogMetadata) {
    return this.send('info', `[AUDIT] ${action}`, {
      ...metadata,
      isAudit: true,
    })
  }

  /**
   * パフォーマンス測定ログ
   */
  async performance(operation: string, duration: number, metadata?: LogMetadata) {
    return this.send('info', `[PERF] ${operation}`, {
      ...metadata,
      duration,
      isPerformance: true,
    })
  }

  /**
   * HTTPリクエストログ
   */
  async request(
    method: string,
    path: string,
    options: {
      status?: number
      duration?: number
      userId?: string
      organizationId?: string
      ip?: string
      userAgent?: string
      [key: string]: any
    } = {}
  ) {
    return this.send('info', `[REQUEST] ${method} ${path}`, {
      method,
      path,
      ...options,
      isRequest: true,
    })
  }
}

// シングルトンインスタンスをエクスポート
export const logger = new Logger()
