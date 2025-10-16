// OPS専用認証アクション
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { validateFormData, signInSchema } from '@/lib/validation'
import { rateLimitLogin } from '@/lib/rate-limit'
import { isOpsUser } from '@/lib/auth/permissions'

/**
 * OPS専用ログイン
 */
export async function opsSignIn(formData: FormData) {
  try {
    // 入力バリデーション
    const validation = validateFormData(signInSchema, formData)
    if (!validation.success) {
      return { error: validation.error }
    }

    const { email, password } = validation.data

    // レート制限チェック（5回/5分）
    const rateLimit = await rateLimitLogin(email)
    if (!rateLimit.success) {
      return { error: rateLimit.error }
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('[opsSignIn] Supabase auth error:', error)

      // エラーメッセージをユーザーフレンドリーに変換
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'メールアドレスまたはパスワードが正しくありません' }
      }

      if (error.message.includes('Email not confirmed')) {
        return { error: 'メールアドレスが確認されていません。受信箱を確認してください。' }
      }

      return { error: 'ログインに失敗しました。もう一度お試しください。' }
    }

    // ログイン成功 - 運用担当者権限をチェックしてOPS画面にリダイレクト
    const { data: { user } } = await supabase.auth.getUser()
    if (user && await isOpsUser(user)) {
      revalidatePath('/', 'layout')
      redirect('/')
    } else {
      // 運用担当者以外はWWWログインページへ
      const wwwUrl = process.env.NEXT_PUBLIC_WWW_URL || 'http://localhost:3000'
      revalidatePath('/', 'layout')
      redirect(`${wwwUrl}/login`)
    }
  } catch (error) {
    console.error('[opsSignIn] Unexpected error:', error)

    // redirectはthrowするので、それ以外のエラーのみキャッチ
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }

    return { error: '予期しないエラーが発生しました。もう一度お試しください。' }
  }
}
