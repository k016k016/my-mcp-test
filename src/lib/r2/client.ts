// Cloudflare R2クライアント
// R2はS3互換APIを使用するため、AWS SDKを利用します
import { S3Client } from '@aws-sdk/client-s3'

// R2クライアントのシングルトンインスタンス
let r2Client: S3Client | null = null

/**
 * R2クライアントを取得
 * S3互換のAPIを使用してR2にアクセスします
 */
export function getR2Client(): S3Client {
  if (r2Client) {
    return r2Client
  }

  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2の環境変数が設定されていません。.env.localファイルを確認してください。'
    )
  }

  // R2のエンドポイントURL
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`

  r2Client = new S3Client({
    region: 'auto', // R2は自動的にリージョンを処理します
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  return r2Client
}

/**
 * R2バケット名を取得
 */
export function getBucketName(): string {
  const bucketName = process.env.R2_BUCKET_NAME

  if (!bucketName) {
    throw new Error(
      'R2_BUCKET_NAMEが設定されていません。.env.localファイルを確認してください。'
    )
  }

  return bucketName
}

/**
 * R2公開URLを取得（カスタムドメインを設定している場合）
 */
export function getPublicUrl(key: string): string | null {
  const publicUrl = process.env.R2_PUBLIC_URL

  if (!publicUrl) {
    return null
  }

  return `${publicUrl}/${key}`
}
