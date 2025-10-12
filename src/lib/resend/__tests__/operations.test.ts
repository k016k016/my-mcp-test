import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import {
  sendEmail,
  sendTemplateEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendNotificationEmail,
  getEmail,
  cancelEmail,
} from '../operations'

// Resend clientのモック
const mockResendClient = {
  emails: {
    send: vi.fn(),
    get: vi.fn(),
    cancel: vi.fn(),
  },
}

// Resend client moduleをモック
vi.mock('../client', () => ({
  getResendClient: () => mockResendClient,
  getDefaultFromEmail: () => 'noreply@example.com',
}))

describe('Resend Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sendEmail', () => {
    it('基本的なメールパラメータで送信できる', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-123',
      })

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'テストメール',
        html: '<p>こんにちは</p>',
      })

      expect(mockResendClient.emails.send).toHaveBeenCalledWith({
        from: 'noreply@example.com',
        to: 'test@example.com',
        subject: 'テストメール',
        html: '<p>こんにちは</p>',
        text: undefined,
        reply_to: undefined,
        cc: undefined,
        bcc: undefined,
        tags: undefined,
        attachments: undefined,
      })
      expect(result).toEqual({ id: 'email-123' })
    })

    it('カスタムfromアドレスを指定できる', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-124',
      })

      await sendEmail({
        to: 'test@example.com',
        subject: 'テスト',
        html: '<p>テスト</p>',
        from: 'custom@example.com',
      })

      expect(mockResendClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'custom@example.com',
        })
      )
    })

    it('複数の受信者を指定できる', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-125',
      })

      await sendEmail({
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'テスト',
        html: '<p>テスト</p>',
      })

      expect(mockResendClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['user1@example.com', 'user2@example.com'],
        })
      )
    })

    it('CC、BCC、reply_toを指定できる', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-126',
      })

      await sendEmail({
        to: 'test@example.com',
        subject: 'テスト',
        html: '<p>テスト</p>',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
        reply_to: 'reply@example.com',
      })

      expect(mockResendClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          cc: 'cc@example.com',
          bcc: 'bcc@example.com',
          reply_to: 'reply@example.com',
        })
      )
    })

    it('タグと添付ファイルを指定できる', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-127',
      })

      const tags = [
        { name: 'category', value: 'welcome' },
        { name: 'priority', value: 'high' },
      ]
      const attachments = [
        {
          filename: 'test.pdf',
          content: Buffer.from('test content'),
          content_type: 'application/pdf',
        },
      ]

      await sendEmail({
        to: 'test@example.com',
        subject: 'テスト',
        html: '<p>テスト</p>',
        tags,
        attachments,
      })

      expect(mockResendClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          tags,
          attachments,
        })
      )
    })

    it('textとhtmlの両方を指定できる', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-128',
      })

      await sendEmail({
        to: 'test@example.com',
        subject: 'テスト',
        html: '<p>HTML版</p>',
        text: 'テキスト版',
      })

      expect(mockResendClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '<p>HTML版</p>',
          text: 'テキスト版',
        })
      )
    })
  })

  describe('sendTemplateEmail', () => {
    it('Reactテンプレートでメールを送信できる', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-200',
      })

      // React.ReactElementのモック（型のみ）
      const mockReactElement = { type: 'div', props: {} } as React.ReactElement

      const result = await sendTemplateEmail({
        to: 'test@example.com',
        subject: 'テンプレートメール',
        react: mockReactElement,
      })

      expect(mockResendClient.emails.send).toHaveBeenCalledWith({
        from: 'noreply@example.com',
        to: 'test@example.com',
        subject: 'テンプレートメール',
        react: mockReactElement,
        reply_to: undefined,
      })
      expect(result).toEqual({ id: 'email-200' })
    })

    it('カスタムfromとreply_toを指定できる', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-201',
      })

      const mockReactElement = { type: 'div', props: {} } as React.ReactElement

      await sendTemplateEmail({
        to: 'test@example.com',
        subject: 'テスト',
        react: mockReactElement,
        from: 'custom@example.com',
        reply_to: 'reply@example.com',
      })

      expect(mockResendClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'custom@example.com',
          reply_to: 'reply@example.com',
        })
      )
    })
  })

  describe('sendWelcomeEmail', () => {
    it('ウェルカムメールを正しい内容で送信できる', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-300',
      })

      const result = await sendWelcomeEmail({
        to: 'newuser@example.com',
        name: '山田太郎',
      })

      expect(mockResendClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'newuser@example.com',
          subject: 'ようこそ！',
          html: expect.stringContaining('ようこそ、山田太郎さん！'),
        })
      )
      expect(result).toEqual({ id: 'email-300' })
    })

    it('ユーザー名がHTML内に含まれる', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-301',
      })

      await sendWelcomeEmail({
        to: 'test@example.com',
        name: 'テストユーザー',
      })

      const call = (mockResendClient.emails.send as Mock).mock.calls[0][0]
      expect(call.html).toContain('テストユーザー')
      expect(call.html).toContain('アカウントの作成ありがとうございます')
    })

    it('カスタムfromアドレスを指定できる', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-302',
      })

      await sendWelcomeEmail({
        to: 'test@example.com',
        name: 'テスト',
        from: 'welcome@example.com',
      })

      expect(mockResendClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'welcome@example.com',
        })
      )
    })
  })

  describe('sendPasswordResetEmail', () => {
    it('パスワードリセットメールを正しい内容で送信できる', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-400',
      })

      const resetUrl = 'https://example.com/reset?token=abc123'

      const result = await sendPasswordResetEmail({
        to: 'user@example.com',
        resetUrl,
      })

      expect(mockResendClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'パスワードリセットのリクエスト',
          html: expect.stringContaining(resetUrl),
        })
      )
      expect(result).toEqual({ id: 'email-400' })
    })

    it('リセットURLがHTML内に2回含まれる（テキストとhref）', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-401',
      })

      const resetUrl = 'https://example.com/reset?token=xyz789'

      await sendPasswordResetEmail({
        to: 'user@example.com',
        resetUrl,
      })

      const call = (mockResendClient.emails.send as Mock).mock.calls[0][0]
      // 正規表現の特殊文字をエスケープ
      const escapedUrl = resetUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const urlOccurrences = (call.html.match(new RegExp(escapedUrl, 'g')) || []).length
      expect(urlOccurrences).toBe(2) // href="${resetUrl}" と >${resetUrl}<
    })

    it('有効期限とキャンセル案内が含まれる', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-402',
      })

      await sendPasswordResetEmail({
        to: 'user@example.com',
        resetUrl: 'https://example.com/reset',
      })

      const call = (mockResendClient.emails.send as Mock).mock.calls[0][0]
      expect(call.html).toContain('24時間有効')
      expect(call.html).toContain('リクエストしていない場合')
    })
  })

  describe('sendVerificationEmail', () => {
    it('確認メールを正しい内容で送信できる', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-500',
      })

      const verificationUrl = 'https://example.com/verify?token=abc123'

      const result = await sendVerificationEmail({
        to: 'user@example.com',
        verificationUrl,
      })

      expect(mockResendClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'メールアドレスの確認',
          html: expect.stringContaining(verificationUrl),
        })
      )
      expect(result).toEqual({ id: 'email-500' })
    })

    it('確認URLがHTML内に2回含まれる', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-501',
      })

      const verificationUrl = 'https://example.com/verify?token=xyz789'

      await sendVerificationEmail({
        to: 'user@example.com',
        verificationUrl,
      })

      const call = (mockResendClient.emails.send as Mock).mock.calls[0][0]
      // 正規表現の特殊文字をエスケープ
      const escapedUrl = verificationUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const urlOccurrences = (call.html.match(new RegExp(escapedUrl, 'g')) || []).length
      expect(urlOccurrences).toBe(2)
    })

    it('有効期限が含まれる', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-502',
      })

      await sendVerificationEmail({
        to: 'user@example.com',
        verificationUrl: 'https://example.com/verify',
      })

      const call = (mockResendClient.emails.send as Mock).mock.calls[0][0]
      expect(call.html).toContain('24時間有効')
    })
  })

  describe('sendNotificationEmail', () => {
    it('基本的な通知メールを送信できる', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-600',
      })

      const result = await sendNotificationEmail({
        to: 'user@example.com',
        title: '重要なお知らせ',
        message: 'システムメンテナンスのお知らせです',
      })

      expect(mockResendClient.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: '重要なお知らせ',
          html: expect.stringContaining('重要なお知らせ'),
        })
      )

      const call = (mockResendClient.emails.send as Mock).mock.calls[0][0]
      expect(call.html).toContain('システムメンテナンスのお知らせです')
      expect(result).toEqual({ id: 'email-600' })
    })

    it('アクションボタン付きの通知メールを送信できる', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-601',
      })

      await sendNotificationEmail({
        to: 'user@example.com',
        title: '新しいメッセージ',
        message: 'メッセージが届きました',
        actionUrl: 'https://example.com/messages',
        actionText: 'メッセージを見る',
      })

      const call = (mockResendClient.emails.send as Mock).mock.calls[0][0]
      expect(call.html).toContain('メッセージを見る')
      expect(call.html).toContain('https://example.com/messages')
      expect(call.html).toContain('<a href=')
    })

    it('アクションなしの場合、ボタンは含まれない', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-602',
      })

      await sendNotificationEmail({
        to: 'user@example.com',
        title: 'お知らせ',
        message: 'これはシンプルな通知です',
      })

      const call = (mockResendClient.emails.send as Mock).mock.calls[0][0]
      expect(call.html).not.toContain('<a href=')
    })

    it('actionUrlだけ指定した場合、ボタンは表示されない', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-603',
      })

      await sendNotificationEmail({
        to: 'user@example.com',
        title: 'お知らせ',
        message: 'テスト',
        actionUrl: 'https://example.com',
        // actionTextなし
      })

      const call = (mockResendClient.emails.send as Mock).mock.calls[0][0]
      expect(call.html).not.toContain('<a href=')
    })

    it('actionTextだけ指定した場合、ボタンは表示されない', async () => {
      mockResendClient.emails.send.mockResolvedValue({
        id: 'email-604',
      })

      await sendNotificationEmail({
        to: 'user@example.com',
        title: 'お知らせ',
        message: 'テスト',
        actionText: 'クリック',
        // actionUrlなし
      })

      const call = (mockResendClient.emails.send as Mock).mock.calls[0][0]
      expect(call.html).not.toContain('<a href=')
    })
  })

  describe('getEmail', () => {
    it('メール情報を取得できる', async () => {
      const mockEmailData = {
        id: 'email-700',
        to: 'test@example.com',
        from: 'noreply@example.com',
        subject: 'テスト',
        created_at: '2024-01-01T00:00:00Z',
      }

      mockResendClient.emails.get.mockResolvedValue(mockEmailData)

      const result = await getEmail('email-700')

      expect(mockResendClient.emails.get).toHaveBeenCalledWith('email-700')
      expect(result).toEqual(mockEmailData)
    })
  })

  describe('cancelEmail', () => {
    it('メール送信をキャンセルできる', async () => {
      mockResendClient.emails.cancel.mockResolvedValue({
        id: 'email-800',
        object: 'email',
      })

      const result = await cancelEmail('email-800')

      expect(mockResendClient.emails.cancel).toHaveBeenCalledWith('email-800')
      expect(result).toEqual({
        id: 'email-800',
        object: 'email',
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('sendEmailがエラーを投げた場合、エラーが伝播する', async () => {
      mockResendClient.emails.send.mockRejectedValue(new Error('API Error'))

      await expect(
        sendEmail({
          to: 'test@example.com',
          subject: 'テスト',
          html: '<p>テスト</p>',
        })
      ).rejects.toThrow('API Error')
    })

    it('getEmailがエラーを投げた場合、エラーが伝播する', async () => {
      mockResendClient.emails.get.mockRejectedValue(new Error('Email not found'))

      await expect(getEmail('invalid-id')).rejects.toThrow('Email not found')
    })

    it('cancelEmailがエラーを投げた場合、エラーが伝播する', async () => {
      mockResendClient.emails.cancel.mockRejectedValue(new Error('Cannot cancel'))

      await expect(cancelEmail('email-id')).rejects.toThrow('Cannot cancel')
    })
  })
})
