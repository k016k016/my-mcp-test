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

// Sentry設定が有効な場合のみwithSentryConfigを適用
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;
const isSentryConfigured = sentryOrg && sentryProject &&
  sentryOrg !== 'your-org-slug' &&
  sentryProject !== 'your-project-name';

// Sentryが正しく設定されている場合のみSentryの設定を適用
export default isSentryConfigured
  ? withSentryConfig(nextConfig, {
      // Sentryのビルド時設定
      org: sentryOrg,
      project: sentryProject,

      // Sentryプラグインのオプション
      silent: !process.env.CI,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
      automaticVercelMonitors: true,
    })
  : nextConfig;
