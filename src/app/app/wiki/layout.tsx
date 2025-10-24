import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Wiki',
  description: 'Organization Wiki',
}

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
