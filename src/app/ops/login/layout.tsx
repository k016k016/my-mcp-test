// OPSログインページ専用レイアウト（認証チェックなし）
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ログイン - Operations Center',
  description: 'Operations Center専用ログイン。運用担当者のみアクセス可能です。',
}

export default function OpsLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
