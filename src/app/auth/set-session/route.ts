import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  
  try {
    const body = await req.json().catch(() => ({}))
    const { access_token, refresh_token } = body

    if (access_token && refresh_token) {
      // セッションをサーバー側Cookieに確定
      const { error } = await supabase.auth.setSession({ access_token, refresh_token })
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true })
    } else {
      // サインアウト同期
      await supabase.auth.signOut()
      return NextResponse.json({ ok: true })
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 })
  }
}
