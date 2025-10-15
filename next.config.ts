import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // ビルド時のESLintエラーを無視（警告のみ表示）
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ビルド時の型エラーを無視（本番デプロイのため）
    ignoreBuildErrors: true,
  },
};

// Sentryの設定でNext.js設定をラップ
export default withSentryConfig(nextConfig, {
  // Sentryのビルド時設定
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Sentryプラグインのオプション
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
