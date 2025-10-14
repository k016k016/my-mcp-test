// Vitestのグローバルセットアップファイル
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// React Testing Libraryのマッチャーを追加
expect.extend(matchers)

// テスト用の環境変数を設定
process.env.NEXT_PUBLIC_WWW_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_APP_URL = 'http://app.localhost:3000'
process.env.NEXT_PUBLIC_ADMIN_URL = 'http://admin.localhost:3000'
process.env.NEXT_PUBLIC_OPS_URL = 'http://ops.localhost:3000'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.NEXT_PUBLIC_LOGFLARE_API_KEY = 'test-logflare-key'
process.env.NEXT_PUBLIC_LOGFLARE_SOURCE_ID = 'test-source-id'
process.env.NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY = 'test-chargebee-key'
process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://test@test.ingest.sentry.io/test'

// Next.js App Routerのモック
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

// Server Actionsのモック（コンポーネントテスト用）
// Note: Server Actions自体のテストではこのモックは使用しません
vi.mock('@/app/actions/members', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/actions/members')>()
  return {
    ...actual,
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
  }
})

// 各テスト後にクリーンアップ
afterEach(() => {
  cleanup()
})
