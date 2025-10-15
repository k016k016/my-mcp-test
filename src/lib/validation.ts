// 入力バリデーションスキーマ
// Server Actionsで使用するZodスキーマを定義
import { z } from 'zod'
import type { OrganizationRole } from '@/types/database'

// ============================================================================
// 認証関連のバリデーション
// ============================================================================

/**
 * メールアドレスのバリデーション
 */
export const emailSchema = z
  .string()
  .min(1, 'メールアドレスを入力してください')
  .email('有効なメールアドレスを入力してください')
  .toLowerCase()
  .trim()

/**
 * パスワードのバリデーション
 * - 6文字以上
 */
export const passwordSchema = z
  .string()
  .min(6, 'パスワードは6文字以上必要です')

/**
 * 会社名のバリデーション
 */
export const companyNameSchema = z
  .string()
  .min(1, '会社名を入力してください')
  .max(100, '会社名は100文字以下である必要があります')
  .trim()

/**
 * 担当者名のバリデーション
 */
export const contactNameSchema = z
  .string()
  .min(1, '担当者名を入力してください')
  .max(100, '担当者名は100文字以下である必要があります')
  .trim()

/**
 * サインアップのバリデーション
 * B2B企業向け: 会社名と担当者名を必須とする
 */
export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'パスワード（確認）を入力してください'),
    companyName: companyNameSchema,
    contactName: contactNameSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  })

/**
 * ログインのバリデーション
 */
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'パスワードを入力してください'),
})

/**
 * パスワードリセットリクエストのバリデーション
 */
export const resetPasswordRequestSchema = z.object({
  email: emailSchema,
})

/**
 * パスワード更新のバリデーション
 */
export const updatePasswordSchema = z.object({
  password: passwordSchema,
})

// ============================================================================
// 組織関連のバリデーション
// ============================================================================

/**
 * 組織slugのバリデーション
 * - 3文字以上32文字以下
 * - 小文字英数字とハイフンのみ
 * - 先頭と末尾はハイフン不可
 */
export const organizationSlugSchema = z
  .string()
  .min(3, '組織IDは3文字以上必要です')
  .max(32, '組織IDは32文字以下である必要があります')
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    '組織IDは小文字英数字とハイフン(-)のみ使用できます（先頭と末尾はハイフン不可）'
  )
  .toLowerCase()
  .trim()

/**
 * 組織名のバリデーション
 */
export const organizationNameSchema = z
  .string()
  .min(1, '組織名を入力してください')
  .max(100, '組織名は100文字以下である必要があります')
  .trim()

/**
 * 組織作成のバリデーション
 */
export const createOrganizationSchema = z.object({
  name: organizationNameSchema,
  slug: organizationSlugSchema,
})

/**
 * 組織更新のバリデーション
 */
export const updateOrganizationSchema = z
  .object({
    name: organizationNameSchema.optional(),
    slug: organizationSlugSchema.optional(),
    metadata: z.record(z.any()).optional(),
  })
  .refine((data) => data.name || data.slug || data.metadata, {
    message: '更新する項目を少なくとも1つ指定してください',
  })

// ============================================================================
// メンバー関連のバリデーション
// ============================================================================

/**
 * 組織ロールのバリデーション
 */
export const organizationRoleSchema = z.enum(['owner', 'admin', 'member'], {
  errorMap: () => ({ message: 'ロールはowner、admin、memberのいずれかである必要があります' }),
})

/**
 * UUIDのバリデーション
 */
export const uuidSchema = z.string().uuid('有効なIDを指定してください')

/**
 * メンバー招待のバリデーション
 */
export const inviteMemberSchema = z.object({
  organizationId: uuidSchema,
  email: emailSchema,
  role: organizationRoleSchema,
})

/**
 * 招待承認のバリデーション
 */
export const acceptInvitationSchema = z.object({
  token: uuidSchema,
})

/**
 * メンバーロール更新のバリデーション
 */
export const updateMemberRoleSchema = z.object({
  organizationId: uuidSchema,
  memberId: uuidSchema,
  newRole: organizationRoleSchema,
})

/**
 * メンバー削除のバリデーション
 */
export const removeMemberSchema = z.object({
  organizationId: uuidSchema,
  memberId: uuidSchema,
})

// ============================================================================
// プロフィール関連のバリデーション
// ============================================================================

/**
 * フルネームのバリデーション
 */
export const fullNameSchema = z
  .string()
  .min(1, '名前を入力してください')
  .max(100, '名前は100文字以下である必要があります')
  .trim()

/**
 * プロフィール更新のバリデーション
 */
export const updateProfileSchema = z.object({
  full_name: fullNameSchema.optional(),
  avatar_url: z.string().url('有効なURLを指定してください').optional().or(z.literal('')),
})

// ============================================================================
// ヘルパー関数
// ============================================================================

/**
 * FormDataからZodスキーマでバリデーションを行う
 */
export function validateFormData<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  try {
    const data = Object.fromEntries(formData.entries())
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError && error.errors && error.errors.length > 0) {
      // 最後のエラー（refineエラーなど）を優先的に返す
      const lastError = error.errors[error.errors.length - 1]
      return { success: false, error: lastError.message }
    }
    return { success: false, error: '入力データの検証に失敗しました' }
  }
}

/**
 * データをZodスキーマでバリデーションを行う
 */
export function validateData<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError && error.errors && error.errors.length > 0) {
      const firstError = error.errors[0]
      console.error('[validateData] Validation error details:', error.errors)
      return { success: false, error: firstError.message }
    }
    return { success: false, error: 'データの検証に失敗しました' }
  }
}

/**
 * パスワードの強度をチェック
 */
export function checkPasswordStrength(password: string): {
  score: number // 0-4 (0: 非常に弱い, 4: 非常に強い)
  feedback: string[]
} {
  let score = 0
  const feedback: string[] = []

  // 長さチェック
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (password.length < 8) feedback.push('8文字以上にしてください')

  // 文字種チェック
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score++
  } else {
    feedback.push('大文字と小文字の両方を含めてください')
  }

  if (/[0-9]/.test(password)) {
    score++
  } else {
    feedback.push('数字を含めてください')
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score++
    if (score > 4) score = 4
  } else {
    feedback.push('記号を含めるとより安全です')
  }

  // 一般的なパターンチェック
  const commonPatterns = ['123456', 'password', 'qwerty', 'abc123']
  if (commonPatterns.some((pattern) => password.toLowerCase().includes(pattern))) {
    score = Math.max(0, score - 2)
    feedback.push('一般的なパスワードは避けてください')
  }

  return { score, feedback }
}
