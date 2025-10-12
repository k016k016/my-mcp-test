// R2へのファイル操作を行う関数群
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getR2Client, getBucketName, getPublicUrl } from './client'

/**
 * ファイルをR2にアップロードする
 */
export async function uploadFile(
  key: string,
  file: Buffer | Uint8Array | Blob | string,
  options?: {
    contentType?: string
    metadata?: Record<string, string>
  }
): Promise<{ key: string; url: string | null }> {
  const r2Client = getR2Client()
  const bucketName = getBucketName()

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: file,
    ContentType: options?.contentType,
    Metadata: options?.metadata,
  })

  await r2Client.send(command)

  return {
    key,
    url: getPublicUrl(key),
  }
}

/**
 * R2からファイルを取得する
 */
export async function getFile(key: string): Promise<{
  body: ReadableStream | Blob | null
  contentType?: string
  metadata?: Record<string, string>
}> {
  const r2Client = getR2Client()
  const bucketName = getBucketName()

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  const response = await r2Client.send(command)

  return {
    body: response.Body as ReadableStream | Blob | null,
    contentType: response.ContentType,
    metadata: response.Metadata,
  }
}

/**
 * R2からファイルを削除する
 */
export async function deleteFile(key: string): Promise<void> {
  const r2Client = getR2Client()
  const bucketName = getBucketName()

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  await r2Client.send(command)
}

/**
 * R2内のファイル一覧を取得する
 */
export async function listFiles(options?: {
  prefix?: string
  maxKeys?: number
  continuationToken?: string
}): Promise<{
  files: Array<{
    key: string
    size: number
    lastModified: Date
  }>
  nextContinuationToken?: string
  isTruncated: boolean
}> {
  const r2Client = getR2Client()
  const bucketName = getBucketName()

  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: options?.prefix,
    MaxKeys: options?.maxKeys || 1000,
    ContinuationToken: options?.continuationToken,
  })

  const response = await r2Client.send(command)

  const files =
    response.Contents?.map((item) => ({
      key: item.Key!,
      size: item.Size || 0,
      lastModified: item.LastModified || new Date(),
    })) || []

  return {
    files,
    nextContinuationToken: response.NextContinuationToken,
    isTruncated: response.IsTruncated || false,
  }
}

/**
 * ファイルが存在するか確認する
 */
export async function fileExists(key: string): Promise<boolean> {
  const r2Client = getR2Client()
  const bucketName = getBucketName()

  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    await r2Client.send(command)
    return true
  } catch (error) {
    return false
  }
}

/**
 * ファイルをコピーする
 */
export async function copyFile(
  sourceKey: string,
  destinationKey: string
): Promise<void> {
  const r2Client = getR2Client()
  const bucketName = getBucketName()

  const command = new CopyObjectCommand({
    Bucket: bucketName,
    CopySource: `${bucketName}/${sourceKey}`,
    Key: destinationKey,
  })

  await r2Client.send(command)
}

/**
 * 署名付きURLを生成する（一時的なアクセス用）
 * @param key ファイルのキー
 * @param expiresIn 有効期限（秒）デフォルトは1時間
 */
export async function generatePresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const r2Client = getR2Client()
  const bucketName = getBucketName()

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  const url = await getSignedUrl(r2Client, command, { expiresIn })
  return url
}

/**
 * アップロード用の署名付きURLを生成する
 * @param key ファイルのキー
 * @param expiresIn 有効期限（秒）デフォルトは1時間
 * @param contentType ファイルのMIMEタイプ
 */
export async function generatePresignedUploadUrl(
  key: string,
  expiresIn: number = 3600,
  contentType?: string
): Promise<string> {
  const r2Client = getR2Client()
  const bucketName = getBucketName()

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  })

  const url = await getSignedUrl(r2Client, command, { expiresIn })
  return url
}
