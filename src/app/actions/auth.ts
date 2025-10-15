// 認証関連のServer Actions
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { env } from '@/lib/env'
import {
  validateFormData,
  signUpSchema,
  signInSchema,
  resetPasswordRequestSchema,
  updatePasswordSchema,
} from '@/lib/validation'
import { rateLimitLogin, rateLimitPasswordReset } from '@/lib/rate-limit'

/**
 * メールアドレスとパスワードでサインアップ
 */
export async function signUp(formData: FormData) {
  try {
    // 入力バリデーション
    const validation = validateFormData(signUpSchema, formData)
    if (!validation.success) {
      return { error: validation.error }
    }

    const { email, password } = validation.data

    // レート制限チェック（サインアップは緩めに設定：10回/時間）
    const rateLimit = await rateLimitLogin(email)
    if (!rateLimit.success) {
      return { error: rateLimit.error }
    }

    const supabase = await createClient()

    // ユーザー登録
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${env.NEXT_PUBLIC_WWW_URL}/auth/callback`,
      },
    })

    if (error) {
      console.error('[signUp] Supabase auth error:', error)

      // エラーメッセージをユーザーフレンドリーに変換
      if (error.message.includes('already registered')) {
        return { error: 'このメールアドレスは既に登録されています' }
      }

      return { error: 'サインアップに失敗しました。もう一度お試しください。' }
    }

    revalidatePath('/', 'layout')

    // メール確認が必要な場合
    if (data.user && !data.session) {
      return { success: true, requiresEmailConfirmation: true }
    }

    // 即座にログインできた場合（メール確認不要設定の場合）
    return { success: true, requiresEmailConfirmation: false }
  } catch (error) {
    console.error('[signUp] Unexpected error:', error)
    return { error: '予期しないエラーが発生しました。もう一度お試しください。' }
  }
}

/**
 * メールアドレスとパスワードでログイン
 */
export async function signIn(formData: FormData) {
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
      console.error('[signIn] Supabase auth error:', error)

      // エラーメッセージをユーザーフレンドリーに変換
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'メールアドレスまたはパスワードが正しくありません' }
      }

      if (error.message.includes('Email not confirmed')) {
        return { error: 'メールアドレスが確認されていません。受信箱を確認してください。' }
      }

      return { error: 'ログインに失敗しました。もう一度お試しください。' }
    }

    // ログイン成功後、APPドメインにリダイレクト
    revalidatePath('/', 'layout')
    redirect(env.NEXT_PUBLIC_APP_URL)
  } catch (error) {
    console.error('[signIn] Unexpected error:', error)

    // redirectはthrowするので、それ以外のエラーのみキャッチ
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }

    return { error: '予期しないエラーが発生しました。もう一度お試しください。' }
  }
}

/**
 * ログアウト
 */
export async function signOut() {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('[signOut] Supabase auth error:', error)
      return { error: 'ログアウトに失敗しました。もう一度お試しください。' }
    }

    revalidatePath('/', 'layout')
    redirect('/login')
  } catch (error) {
    console.error('[signOut] Unexpected error:', error)

    // redirectはthrowするので、それ以外のエラーのみキャッチ
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }

    return { error: '予期しないエラーが発生しました。もう一度お試しください。' }
  }
}

/**
 * Googleでログイン
 */
export async function signInWithGoogle() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${env.NEXT_PUBLIC_WWW_URL}/auth/callback`,
      },
    })

    if (error) {
      console.error('[signInWithGoogle] Supabase auth error:', error)
      return { error: 'Googleログインに失敗しました。もう一度お試しください。' }
    }

    if (data.url) {
      redirect(data.url)
    }

    return { error: 'リダイレクトURLが取得できませんでした' }
  } catch (error) {
    console.error('[signInWithGoogle] Unexpected error:', error)

    // redirectはthrowするので、それ以外のエラーのみキャッチ
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }

    return { error: '予期しないエラーが発生しました。もう一度お試しください。' }
  }
}

/**
 * パスワードリセットメールを送信
 */
export async function resetPassword(formData: FormData) {
  try {
    // 入力バリデーション
    const validation = validateFormData(resetPasswordRequestSchema, formData)
    if (!validation.success) {
      return { error: validation.error }
    }

    const { email } = validation.data

    // レート制限チェック（3回/時間）
    const rateLimit = await rateLimitPasswordReset(email)
    if (!rateLimit.success) {
      return { error: rateLimit.error }
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.NEXT_PUBLIC_WWW_URL}/reset-password`,
    })

    if (error) {
      console.error('[resetPassword] Supabase auth error:', error)
      // セキュリティのため、メールアドレスが存在しない場合でも成功メッセージを返す
    }

    return { success: 'パスワードリセットメールを送信しました。受信箱を確認してください。' }
  } catch (error) {
    console.error('[resetPassword] Unexpected error:', error)
    return { error: '予期しないエラーが発生しました。もう一度お試しください。' }
  }
}

/**
 * パスワードを更新
 */
export async function updatePassword(formData: FormData) {
  try {
    // 入力バリデーション
    const validation = validateFormData(updatePasswordSchema, formData)
    if (!validation.success) {
      return { error: validation.error }
    }

    const { password } = validation.data

    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      console.error('[updatePassword] Supabase auth error:', error)
      return { error: 'パスワードの更新に失敗しました。もう一度お試しください。' }
    }

    // パスワード更新成功後、APPドメインにリダイレクト
    revalidatePath('/', 'layout')
    redirect(env.NEXT_PUBLIC_APP_URL)
  } catch (error) {
    console.error('[updatePassword] Unexpected error:', error)

    // redirectはthrowするので、それ以外のエラーのみキャッチ
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error
    }

    return { error: '予期しないエラーが発生しました。もう一度お試しください。' }
  }
}
