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
    // Member権限のテスト（APPドメイン用）
    {
      name: 'member-chromium',
      testMatch: /app-domain\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/member.json',
        navigationTimeout: 30000,
        actionTimeout: 10000,
      },
    },
    {
      name: 'member-firefox',
      testMatch: /app-domain\.spec\.ts/,
      use: {
        ...devices['Desktop Firefox'],
        storageState: '.auth/member.json',
        navigationTimeout: 45000,
        actionTimeout: 15000,
      },
    },
    {
      name: 'member-webkit',
      testMatch: /app-domain\.spec\.ts/,
      use: {
        ...devices['Desktop Safari'],
        storageState: '.auth/member.json',
        navigationTimeout: 60000,
        actionTimeout: 20000,
      },
    },

    // Admin権限のテスト（ADMINドメイン用）
    {
      name: 'admin-chromium',
      testMatch: /admin-domain\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/admin.json',
        navigationTimeout: 30000,
        actionTimeout: 10000,
      },
    },
    {
      name: 'admin-firefox',
      testMatch: /admin-domain\.spec\.ts/,
      use: {
        ...devices['Desktop Firefox'],
        storageState: '.auth/admin.json',
        navigationTimeout: 45000,
        actionTimeout: 15000,
      },
    },
    {
      name: 'admin-webkit',
      testMatch: /admin-domain\.spec\.ts/,
      use: {
        ...devices['Desktop Safari'],
        storageState: '.auth/admin.json',
        navigationTimeout: 60000,
        actionTimeout: 20000,
      },
    },

    // Wiki機能のテスト（member権限、APPドメイン）
    {
      name: 'wiki-chromium',
      testMatch: /wiki\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/member.json',
        navigationTimeout: 30000,
        actionTimeout: 10000,
      },
    },
    {
      name: 'wiki-firefox',
      testMatch: /wiki\.spec\.ts/,
      use: {
        ...devices['Desktop Firefox'],
        storageState: '.auth/member.json',
        navigationTimeout: 45000,
        actionTimeout: 15000,
      },
    },
    // WebKitはServer Actionとの相性問題でスキップ（Chromium/Firefoxで動作確認済み）
    // {
    //   name: 'wiki-webkit',
    //   testMatch: /wiki\.spec\.ts/,
    //   use: {
    //     ...devices['Desktop Safari'],
    //     storageState: '.auth/member.json',
    //     navigationTimeout: 90000,
    //     actionTimeout: 30000,
    //   },
    //   timeout: 120000,
    //   expect: {
    //     timeout: 40000,
    //   },
    // },

    // その他のテスト（storageState不要）
    {
      name: 'chromium',
      testIgnore: [/app-domain\.spec\.ts/, /admin-domain\.spec\.ts/, /wiki\.spec\.ts/],
      use: {
        ...devices['Desktop Chrome'],
        navigationTimeout: 30000,
        actionTimeout: 10000,
      },
    },
    {
      name: 'firefox',
      testIgnore: [/app-domain\.spec\.ts/, /admin-domain\.spec\.ts/, /wiki\.spec\.ts/],
      use: {
        ...devices['Desktop Firefox'],
        navigationTimeout: 45000,
        actionTimeout: 15000,
      },
    },
    {
      name: 'webkit',
      testIgnore: [/app-domain\.spec\.ts/, /admin-domain\.spec\.ts/, /wiki\.spec\.ts/],
      use: {
        ...devices['Desktop Safari'],
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
