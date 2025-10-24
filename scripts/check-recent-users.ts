// 最近のユーザーと組織の関連を確認するスクリプト
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

async function checkOrganization() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 最近作成されたユーザーを取得
  const { data: users } = await supabase.auth.admin.listUsers()
  const recentUsers = users?.users
    .filter(u => u.email && u.email.includes('@'))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  console.log('\n📋 最近のユーザー（直近5件）:')
  for (const user of recentUsers || []) {
    console.log(`\n👤 ${user.email} (${user.id})`)
    console.log(`   作成: ${user.created_at}`)

    // このユーザーの組織を確認
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id, role, organizations(name)')
      .eq('user_id', user.id)

    if (memberships && memberships.length > 0) {
      console.log(`   ✅ 組織メンバーシップ: ${memberships.length}件`)
      memberships.forEach((m: any) => {
        console.log(`      - ${m.organizations?.name || 'Unknown'} (role: ${m.role})`)
      })
    } else {
      console.log(`   ❌ 組織メンバーシップなし`)
    }
  }
}

checkOrganization().catch(console.error)
