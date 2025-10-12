// Vitestのグローバルセットアップファイル
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// React Testing Libraryのマッチャーを追加
expect.extend(matchers)

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
