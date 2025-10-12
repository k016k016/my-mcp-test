// Resend操作関数
import { getResendClient, getDefaultFromEmail } from './client'

/**
 * メール送信パラメータ
 */
export type SendEmailParams = {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  reply_to?: string
  cc?: string | string[]
  bcc?: string | string[]
  tags?: Array<{ name: string; value: string }>
  attachments?: Array<{
    filename: string
    content: Buffer | string
    content_type?: string
  }>
}

/**
 * メールを送信する
 */
export async function sendEmail(params: SendEmailParams) {
  const resend = getResendClient()

  const result = await resend.emails.send({
    from: params.from || getDefaultFromEmail(),
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    reply_to: params.reply_to,
    cc: params.cc,
    bcc: params.bcc,
    tags: params.tags,
    attachments: params.attachments,
  })

  return result
}

/**
 * テンプレートメールを送信する（React Emailと組み合わせて使用）
 */
export async function sendTemplateEmail(params: {
  to: string | string[]
  subject: string
  react: React.ReactElement
  from?: string
  reply_to?: string
}) {
  const resend = getResendClient()

  const result = await resend.emails.send({
    from: params.from || getDefaultFromEmail(),
    to: params.to,
    subject: params.subject,
    react: params.react,
    reply_to: params.reply_to,
  })

  return result
}

/**
 * ウェルカムメールを送信する
 */
export async function sendWelcomeEmail(params: {
  to: string
  name: string
  from?: string
}) {
  return await sendEmail({
    to: params.to,
    subject: 'ようこそ！',
    html: `
      <h1>ようこそ、${params.name}さん！</h1>
      <p>アカウントの作成ありがとうございます。</p>
      <p>サービスをお楽しみください。</p>
    `,
    from: params.from,
  })
}

/**
 * パスワードリセットメールを送信する
 */
export async function sendPasswordResetEmail(params: {
  to: string
  resetUrl: string
  from?: string
}) {
  return await sendEmail({
    to: params.to,
    subject: 'パスワードリセットのリクエスト',
    html: `
      <h1>パスワードリセット</h1>
      <p>パスワードをリセットするには、以下のリンクをクリックしてください：</p>
      <a href="${params.resetUrl}">${params.resetUrl}</a>
      <p>このリンクは24時間有効です。</p>
      <p>リクエストしていない場合は、このメールを無視してください。</p>
    `,
    from: params.from,
  })
}

/**
 * 確認メールを送信する
 */
export async function sendVerificationEmail(params: {
  to: string
  verificationUrl: string
  from?: string
}) {
  return await sendEmail({
    to: params.to,
    subject: 'メールアドレスの確認',
    html: `
      <h1>メールアドレスの確認</h1>
      <p>以下のリンクをクリックして、メールアドレスを確認してください：</p>
      <a href="${params.verificationUrl}">${params.verificationUrl}</a>
      <p>このリンクは24時間有効です。</p>
    `,
    from: params.from,
  })
}

/**
 * 通知メールを送信する
 */
export async function sendNotificationEmail(params: {
  to: string
  title: string
  message: string
  actionUrl?: string
  actionText?: string
  from?: string
}) {
  let html = `
    <h1>${params.title}</h1>
    <p>${params.message}</p>
  `

  if (params.actionUrl && params.actionText) {
    html += `
      <p>
        <a href="${params.actionUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          ${params.actionText}
        </a>
      </p>
    `
  }

  return await sendEmail({
    to: params.to,
    subject: params.title,
    html,
    from: params.from,
  })
}

/**
 * メール送信履歴を取得する
 */
export async function getEmail(emailId: string) {
  const resend = getResendClient()

  const result = await resend.emails.get(emailId)
  return result
}

/**
 * メール送信をキャンセルする（送信前のみ）
 */
export async function cancelEmail(emailId: string) {
  const resend = getResendClient()

  const result = await resend.emails.cancel(emailId)
  return result
}
