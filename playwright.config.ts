import { defineConfig, devices } from '@playwright/test'

// 環境変数からベースURLを取得（デフォルトはlocalhost）
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // ローカルでは2ワーカー、CIでは1ワーカー（セッション競合を軽減）
  workers: process.env.CI ? 1 : 2,
  reporter: 'html',

  // テストタイムアウト：ブラウザの遅さを考慮して長めに設定
  timeout: 60000, // 60秒（デフォルトの30秒から延長）

  // グローバルセットアップ・ティアダウン
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Chromiumは高速なので標準タイムアウト
        navigationTimeout: 30000,
        actionTimeout: 10000,
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Firefoxは若干遅いのでタイムアウトを延長
        navigationTimeout: 45000,
        actionTimeout: 15000,
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        // WebKitは最も遅いのでタイムアウトを最長に
        navigationTimeout: 60000,
        actionTimeout: 20000,
      },
    },
  ],

  // ローカル環境でのみwebServerを起動（Vercelテスト時は不要）
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
      },
})
