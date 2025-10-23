// バリデーション機能のテスト
import { describe, it, expect } from 'vitest'
import {
  emailSchema,
  passwordSchema,
  signUpSchema,
  organizationNameSchema,
  checkPasswordStrength,
} from '@/lib/validation'

describe('Validation', () => {
  describe('emailSchema', () => {
    it('有効なメールアドレスを許可する', () => {
      expect(emailSchema.parse('test@example.com')).toBe('test@example.com')
      expect(emailSchema.parse('user+tag@domain.co.jp')).toBe('user+tag@domain.co.jp')
    })

    it('無効なメールアドレスを拒否する', () => {
      expect(() => emailSchema.parse('invalid')).toThrow()
      expect(() => emailSchema.parse('test@')).toThrow()
      expect(() => emailSchema.parse('@example.com')).toThrow()
    })

    it('空文字列を拒否する', () => {
      expect(() => emailSchema.parse('')).toThrow()
    })
  })

  describe('passwordSchema', () => {
    it('有効なパスワードを許可する', () => {
      expect(passwordSchema.parse('Password123')).toBe('Password123')
      expect(passwordSchema.parse('MyP@ssw0rd')).toBe('MyP@ssw0rd')
      expect(passwordSchema.parse('pass12')).toBe('pass12') // 6文字以上なら許可
    })

    it('6文字未満のパスワードを拒否する', () => {
      expect(() => passwordSchema.parse('Pass1')).toThrow()
      expect(() => passwordSchema.parse('abc12')).toThrow()
    })

    it('大文字・小文字・数字の要件はない（基本スキーマは最小文字数のみチェック）', () => {
      // パスワードスキーマ自体は6文字以上のみチェック
      // 強度チェックはcheckPasswordStrength関数で行う
      expect(passwordSchema.parse('password123')).toBe('password123')
      expect(passwordSchema.parse('PASSWORD123')).toBe('PASSWORD123')
      expect(passwordSchema.parse('Password')).toBe('Password')
    })
  })

  describe('signUpSchema', () => {
    it('有効なサインアップデータを許可する', () => {
      const data = signUpSchema.parse({
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        companyName: 'Test Company',
        contactName: 'Test User',
      })
      expect(data.email).toBe('test@example.com')
      expect(data.password).toBe('Password123')
      expect(data.confirmPassword).toBe('Password123')
      expect(data.companyName).toBe('Test Company')
      expect(data.contactName).toBe('Test User')
    })

    it('無効なデータを拒否する', () => {
      expect(() =>
        signUpSchema.parse({
          email: 'invalid',
          password: 'weak',
          confirmPassword: 'weak',
          companyName: 'Test Company',
          contactName: 'Test User',
        })
      ).toThrow()
    })
  })

  describe('organizationNameSchema', () => {
    it('有効な組織名を許可する', () => {
      expect(organizationNameSchema.parse('My Organization')).toBe('My Organization')
      expect(organizationNameSchema.parse('株式会社テスト')).toBe('株式会社テスト')
    })

    it('空文字列を拒否する', () => {
      expect(() => organizationNameSchema.parse('')).toThrow()
    })

    it('100文字を超える組織名を拒否する', () => {
      expect(() => organizationNameSchema.parse('a'.repeat(101))).toThrow()
    })
  })

  describe('checkPasswordStrength', () => {
    it('弱いパスワードを正しく評価する', () => {
      const result = checkPasswordStrength('pass')
      expect(result.score).toBeLessThan(2)
      expect(result.feedback.length).toBeGreaterThan(0)
    })

    it('中程度のパスワードを正しく評価する', () => {
      const result = checkPasswordStrength('MyPassword123')
      expect(result.score).toBeGreaterThanOrEqual(2)
      expect(result.score).toBeLessThanOrEqual(4)
    })

    it('強いパスワードを正しく評価する', () => {
      const result = checkPasswordStrength('MyP@ssw0rd123!')
      expect(result.score).toBeGreaterThanOrEqual(3)
    })

    it('一般的なパスワードを検出する', () => {
      const result = checkPasswordStrength('password123')
      expect(result.feedback).toContain('一般的なパスワードは避けてください')
    })
  })
})
