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

// Server Actionsのモック
vi.mock('@/app/actions/members', () => ({
  updateMemberRole: vi.fn(),
  removeMember: vi.fn(),
}))

// 各テスト後にクリーンアップ
afterEach(() => {
  cleanup()
})
