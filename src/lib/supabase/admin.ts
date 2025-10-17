// Supabase Admin Client (Service Role)
// RLSをバイパスして管理操作を実行する場合に使用
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import type { Database } from '@/types/database'

let adminClient: ReturnType<typeof createClient<Database>> | null = null

/**
 * サービスロールキーを使用したSupabase管理クライアントを取得
 * 注意: このクライアントはRLSをバイパスするため、慎重に使用すること
 */
export function getAdminClient() {
  if (!adminClient) {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseServiceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
    }

    adminClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return adminClient
}
