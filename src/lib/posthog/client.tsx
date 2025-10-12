// PostHogクライアント（ブラウザ側用）
'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * PostHogの初期化
 */
export function initPostHog() {
  if (typeof window !== 'undefined') {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'

    if (apiKey) {
      posthog.init(apiKey, {
        api_host: apiHost,
        // ページビューの自動追跡を無効化（手動で追跡します）
        capture_pageview: false,
        // セッションリプレイの設定
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: '*',
        },
      })
    }
  }

  return posthog
}

/**
 * PostHogプロバイダーコンポーネント
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const client = initPostHog()

  return <PHProvider client={client}>{children}</PHProvider>
}

/**
 * ページビュー追跡用フック
 */
export function PostHogPageView(): null {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname
      if (searchParams && searchParams.toString()) {
        url = url + '?' + searchParams.toString()
      }
      posthog.capture('$pageview', {
        $current_url: url,
      })
    }
  }, [pathname, searchParams])

  return null
}
