// 組織クッキーを初期化するためのClient Component
'use client'

import { useEffect } from 'react'
import { setCurrentOrganizationId } from '@/lib/organization/current'

interface InitializeOrganizationProps {
  organizationId: string
}

export function InitializeOrganization({ organizationId }: InitializeOrganizationProps) {
  useEffect(() => {
    // クライアント側でServer Actionを呼び出してクッキーを設定
    setCurrentOrganizationId(organizationId).catch((error) => {
      console.error('Failed to set organization cookie:', error)
    })
  }, [organizationId])

  // UIには何も表示しない
  return null
}
