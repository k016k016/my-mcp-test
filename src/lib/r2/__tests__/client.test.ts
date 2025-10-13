import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// @aws-sdk/client-s3 をモック
const mockS3ClientConstructor = vi.fn()

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: mockS3ClientConstructor,
}))

describe('R2 Client', () => {
  // 環境変数の元の値を保存
  const originalR2AccountId = process.env.R2_ACCOUNT_ID
  const originalR2AccessKeyId = process.env.R2_ACCESS_KEY_ID
  const originalR2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const originalR2BucketName = process.env.R2_BUCKET_NAME
  const originalR2PublicUrl = process.env.R2_PUBLIC_URL

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    // 環境変数を元に戻す
    if (originalR2AccountId !== undefined) {
      process.env.R2_ACCOUNT_ID = originalR2AccountId
    } else {
      delete process.env.R2_ACCOUNT_ID
    }

    if (originalR2AccessKeyId !== undefined) {
      process.env.R2_ACCESS_KEY_ID = originalR2AccessKeyId
    } else {
      delete process.env.R2_ACCESS_KEY_ID
    }

    if (originalR2SecretAccessKey !== undefined) {
      process.env.R2_SECRET_ACCESS_KEY = originalR2SecretAccessKey
    } else {
      delete process.env.R2_SECRET_ACCESS_KEY
    }

    if (originalR2BucketName !== undefined) {
      process.env.R2_BUCKET_NAME = originalR2BucketName
    } else {
      delete process.env.R2_BUCKET_NAME
    }

    if (originalR2PublicUrl !== undefined) {
      process.env.R2_PUBLIC_URL = originalR2PublicUrl
    } else {
      delete process.env.R2_PUBLIC_URL
    }
  })

  describe('getR2Client', () => {
    it('環境変数が設定されている場合、R2クライアントを作成する', async () => {
      process.env.R2_ACCOUNT_ID = 'test-account-id'
      process.env.R2_ACCESS_KEY_ID = 'test-access-key'
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key'

      const mockClient = { send: vi.fn() }
      mockS3ClientConstructor.mockImplementation(() => mockClient)

      const { getR2Client } = await import('../client')
      const client = getR2Client()

      expect(mockS3ClientConstructor).toHaveBeenCalledWith({
        region: 'auto',
        endpoint: 'https://test-account-id.r2.cloudflarestorage.com',
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
        },
      })
      expect(client).toBe(mockClient)
    })

    it('R2_ACCOUNT_IDが未設定の場合、エラーを投げる', async () => {
      delete process.env.R2_ACCOUNT_ID
      process.env.R2_ACCESS_KEY_ID = 'test-access-key'
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key'

      const { getR2Client } = await import('../client')

      expect(() => getR2Client()).toThrow(
        'R2の環境変数が設定されていません。.env.localファイルを確認してください。'
      )
    })

    it('R2_ACCESS_KEY_IDが未設定の場合、エラーを投げる', async () => {
      process.env.R2_ACCOUNT_ID = 'test-account-id'
      delete process.env.R2_ACCESS_KEY_ID
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key'

      const { getR2Client } = await import('../client')

      expect(() => getR2Client()).toThrow(
        'R2の環境変数が設定されていません。.env.localファイルを確認してください。'
      )
    })

    it('R2_SECRET_ACCESS_KEYが未設定の場合、エラーを投げる', async () => {
      process.env.R2_ACCOUNT_ID = 'test-account-id'
      process.env.R2_ACCESS_KEY_ID = 'test-access-key'
      delete process.env.R2_SECRET_ACCESS_KEY

      const { getR2Client } = await import('../client')

      expect(() => getR2Client()).toThrow(
        'R2の環境変数が設定されていません。.env.localファイルを確認してください。'
      )
    })

    it('全ての環境変数が未設定の場合、エラーを投げる', async () => {
      delete process.env.R2_ACCOUNT_ID
      delete process.env.R2_ACCESS_KEY_ID
      delete process.env.R2_SECRET_ACCESS_KEY

      const { getR2Client } = await import('../client')

      expect(() => getR2Client()).toThrow(
        'R2の環境変数が設定されていません。.env.localファイルを確認してください。'
      )
    })

    it('R2_ACCOUNT_IDが空文字列の場合、エラーを投げる', async () => {
      process.env.R2_ACCOUNT_ID = ''
      process.env.R2_ACCESS_KEY_ID = 'test-access-key'
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key'

      const { getR2Client } = await import('../client')

      expect(() => getR2Client()).toThrow()
    })

    it('R2_ACCESS_KEY_IDが空文字列の場合、エラーを投げる', async () => {
      process.env.R2_ACCOUNT_ID = 'test-account-id'
      process.env.R2_ACCESS_KEY_ID = ''
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key'

      const { getR2Client } = await import('../client')

      expect(() => getR2Client()).toThrow()
    })

    it('R2_SECRET_ACCESS_KEYが空文字列の場合、エラーを投げる', async () => {
      process.env.R2_ACCOUNT_ID = 'test-account-id'
      process.env.R2_ACCESS_KEY_ID = 'test-access-key'
      process.env.R2_SECRET_ACCESS_KEY = ''

      const { getR2Client } = await import('../client')

      expect(() => getR2Client()).toThrow()
    })

    it('シングルトンパターンで同じインスタンスを返す', async () => {
      process.env.R2_ACCOUNT_ID = 'singleton-test'
      process.env.R2_ACCESS_KEY_ID = 'singleton-access-key'
      process.env.R2_SECRET_ACCESS_KEY = 'singleton-secret-key'

      const mockClient = { id: 'singleton-client' }
      mockS3ClientConstructor.mockImplementation(() => mockClient)

      const { getR2Client } = await import('../client')

      const client1 = getR2Client()
      const client2 = getR2Client()

      expect(client1).toBe(client2) // 同じインスタンス
      expect(mockS3ClientConstructor).toHaveBeenCalledTimes(1) // 1回だけ作成
    })

    it('異なる環境変数でも最初のインスタンスが再利用される', async () => {
      process.env.R2_ACCOUNT_ID = 'first-account'
      process.env.R2_ACCESS_KEY_ID = 'first-access-key'
      process.env.R2_SECRET_ACCESS_KEY = 'first-secret-key'

      const mockClient = { id: 'first-client' }
      mockS3ClientConstructor.mockImplementation(() => mockClient)

      const { getR2Client } = await import('../client')

      const client1 = getR2Client()
      expect(mockS3ClientConstructor).toHaveBeenCalledWith({
        region: 'auto',
        endpoint: 'https://first-account.r2.cloudflarestorage.com',
        credentials: {
          accessKeyId: 'first-access-key',
          secretAccessKey: 'first-secret-key',
        },
      })

      // 環境変数を変更してもキャッシュされたインスタンスが返される
      process.env.R2_ACCOUNT_ID = 'second-account'
      process.env.R2_ACCESS_KEY_ID = 'second-access-key'
      process.env.R2_SECRET_ACCESS_KEY = 'second-secret-key'
      const client2 = getR2Client()

      expect(client1).toBe(client2) // 同じインスタンス
      expect(mockS3ClientConstructor).toHaveBeenCalledTimes(1) // 1回だけ作成
    })

    it('エンドポイントURLが正しく生成される', async () => {
      process.env.R2_ACCOUNT_ID = 'abc123def456'
      process.env.R2_ACCESS_KEY_ID = 'test-key'
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret'

      mockS3ClientConstructor.mockImplementation(() => ({}))

      const { getR2Client } = await import('../client')
      getR2Client()

      const [config] = mockS3ClientConstructor.mock.calls[0]
      expect(config.endpoint).toBe('https://abc123def456.r2.cloudflarestorage.com')
    })

    it('リージョンが常に"auto"に設定される', async () => {
      process.env.R2_ACCOUNT_ID = 'test-account'
      process.env.R2_ACCESS_KEY_ID = 'test-key'
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret'

      mockS3ClientConstructor.mockImplementation(() => ({}))

      const { getR2Client } = await import('../client')
      getR2Client()

      const [config] = mockS3ClientConstructor.mock.calls[0]
      expect(config.region).toBe('auto')
    })
  })

  describe('getBucketName', () => {
    it('R2_BUCKET_NAMEが設定されている場合、その値を返す', async () => {
      process.env.R2_BUCKET_NAME = 'my-test-bucket'

      const { getBucketName } = await import('../client')
      const bucketName = getBucketName()

      expect(bucketName).toBe('my-test-bucket')
    })

    it('R2_BUCKET_NAMEが未設定の場合、エラーを投げる', async () => {
      delete process.env.R2_BUCKET_NAME

      const { getBucketName } = await import('../client')

      expect(() => getBucketName()).toThrow(
        'R2_BUCKET_NAMEが設定されていません。.env.localファイルを確認してください。'
      )
    })

    it('R2_BUCKET_NAMEが空文字列の場合、エラーを投げる', async () => {
      process.env.R2_BUCKET_NAME = ''

      const { getBucketName } = await import('../client')

      expect(() => getBucketName()).toThrow(
        'R2_BUCKET_NAMEが設定されていません。.env.localファイルを確認してください。'
      )
    })

    it('複数回呼び出しても同じ値を返す', async () => {
      process.env.R2_BUCKET_NAME = 'consistent-bucket'

      const { getBucketName } = await import('../client')

      const bucketName1 = getBucketName()
      const bucketName2 = getBucketName()

      expect(bucketName1).toBe(bucketName2)
      expect(bucketName1).toBe('consistent-bucket')
    })

    it('ハイフン付きのバケット名を受け入れる', async () => {
      process.env.R2_BUCKET_NAME = 'my-production-bucket'

      const { getBucketName } = await import('../client')
      const bucketName = getBucketName()

      expect(bucketName).toBe('my-production-bucket')
    })

    it('数字を含むバケット名を受け入れる', async () => {
      process.env.R2_BUCKET_NAME = 'bucket-123-test'

      const { getBucketName } = await import('../client')
      const bucketName = getBucketName()

      expect(bucketName).toBe('bucket-123-test')
    })
  })

  describe('getPublicUrl', () => {
    it('R2_PUBLIC_URLが設定されている場合、公開URLを返す', async () => {
      process.env.R2_PUBLIC_URL = 'https://cdn.example.com'

      const { getPublicUrl } = await import('../client')
      const url = getPublicUrl('images/photo.jpg')

      expect(url).toBe('https://cdn.example.com/images/photo.jpg')
    })

    it('R2_PUBLIC_URLが未設定の場合、nullを返す', async () => {
      delete process.env.R2_PUBLIC_URL

      const { getPublicUrl } = await import('../client')
      const url = getPublicUrl('images/photo.jpg')

      expect(url).toBeNull()
    })

    it('R2_PUBLIC_URLが空文字列の場合、nullを返す', async () => {
      process.env.R2_PUBLIC_URL = ''

      const { getPublicUrl } = await import('../client')
      const url = getPublicUrl('images/photo.jpg')

      expect(url).toBeNull()
    })

    it('異なるキーで公開URLを生成できる', async () => {
      process.env.R2_PUBLIC_URL = 'https://files.myapp.com'

      const { getPublicUrl } = await import('../client')

      const url1 = getPublicUrl('documents/file.pdf')
      const url2 = getPublicUrl('videos/clip.mp4')

      expect(url1).toBe('https://files.myapp.com/documents/file.pdf')
      expect(url2).toBe('https://files.myapp.com/videos/clip.mp4')
    })

    it('パスの先頭にスラッシュがあっても正しく処理する', async () => {
      process.env.R2_PUBLIC_URL = 'https://cdn.example.com'

      const { getPublicUrl } = await import('../client')
      const url = getPublicUrl('/images/photo.jpg')

      expect(url).toBe('https://cdn.example.com//images/photo.jpg')
    })

    it('空のキーでもURLを生成できる', async () => {
      process.env.R2_PUBLIC_URL = 'https://cdn.example.com'

      const { getPublicUrl } = await import('../client')
      const url = getPublicUrl('')

      expect(url).toBe('https://cdn.example.com/')
    })

    it('複雑なパス構造を含むキーを処理できる', async () => {
      process.env.R2_PUBLIC_URL = 'https://storage.example.com'

      const { getPublicUrl } = await import('../client')
      const url = getPublicUrl('users/123/uploads/2024/01/image.png')

      expect(url).toBe('https://storage.example.com/users/123/uploads/2024/01/image.png')
    })

    it('URLエンコードが必要な文字を含むキーを処理できる', async () => {
      process.env.R2_PUBLIC_URL = 'https://cdn.example.com'

      const { getPublicUrl } = await import('../client')
      const url = getPublicUrl('files/document with spaces.pdf')

      expect(url).toBe('https://cdn.example.com/files/document with spaces.pdf')
    })
  })

  describe('統合テスト', () => {
    it('全ての環境変数が設定されている場合、すべての関数が正常に動作する', async () => {
      process.env.R2_ACCOUNT_ID = 'integration-account'
      process.env.R2_ACCESS_KEY_ID = 'integration-key'
      process.env.R2_SECRET_ACCESS_KEY = 'integration-secret'
      process.env.R2_BUCKET_NAME = 'integration-bucket'
      process.env.R2_PUBLIC_URL = 'https://cdn.integration.com'

      const mockClient = { send: vi.fn() }
      mockS3ClientConstructor.mockImplementation(() => mockClient)

      const { getR2Client, getBucketName, getPublicUrl } = await import('../client')

      const client = getR2Client()
      const bucketName = getBucketName()
      const url = getPublicUrl('test.jpg')

      expect(client).toBeDefined()
      expect(bucketName).toBe('integration-bucket')
      expect(url).toBe('https://cdn.integration.com/test.jpg')
    })

    it('R2_PUBLIC_URLがない場合でもクライアントとバケット名は取得できる', async () => {
      process.env.R2_ACCOUNT_ID = 'test-account'
      process.env.R2_ACCESS_KEY_ID = 'test-key'
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret'
      process.env.R2_BUCKET_NAME = 'test-bucket'
      delete process.env.R2_PUBLIC_URL

      const mockClient = { send: vi.fn() }
      mockS3ClientConstructor.mockImplementation(() => mockClient)

      const { getR2Client, getBucketName, getPublicUrl } = await import('../client')

      expect(() => getR2Client()).not.toThrow()
      expect(() => getBucketName()).not.toThrow()
      expect(getPublicUrl('test.jpg')).toBeNull()
    })
  })

  describe('エラーメッセージの検証', () => {
    it('getR2Clientのエラーメッセージが適切', async () => {
      delete process.env.R2_ACCOUNT_ID
      delete process.env.R2_ACCESS_KEY_ID
      delete process.env.R2_SECRET_ACCESS_KEY

      const { getR2Client } = await import('../client')

      try {
        getR2Client()
        expect.fail('エラーが投げられるべき')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe(
          'R2の環境変数が設定されていません。.env.localファイルを確認してください。'
        )
      }
    })

    it('getBucketNameのエラーメッセージが適切', async () => {
      delete process.env.R2_BUCKET_NAME

      const { getBucketName } = await import('../client')

      try {
        getBucketName()
        expect.fail('エラーが投げられるべき')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe(
          'R2_BUCKET_NAMEが設定されていません。.env.localファイルを確認してください。'
        )
      }
    })
  })

  describe('環境変数の検証', () => {
    it('R2_ACCOUNT_IDが正しく読み込まれる', async () => {
      const testAccountId = 'test-account-id-123'
      process.env.R2_ACCOUNT_ID = testAccountId
      process.env.R2_ACCESS_KEY_ID = 'test-key'
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret'

      mockS3ClientConstructor.mockImplementation(() => ({}))

      const { getR2Client } = await import('../client')
      getR2Client()

      const [config] = mockS3ClientConstructor.mock.calls[0]
      expect(config.endpoint).toContain(testAccountId)
    })

    it('R2_ACCESS_KEY_IDが正しく読み込まれる', async () => {
      const testAccessKey = 'test-access-key-456'
      process.env.R2_ACCOUNT_ID = 'test-account'
      process.env.R2_ACCESS_KEY_ID = testAccessKey
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret'

      mockS3ClientConstructor.mockImplementation(() => ({}))

      const { getR2Client } = await import('../client')
      getR2Client()

      const [config] = mockS3ClientConstructor.mock.calls[0]
      expect(config.credentials.accessKeyId).toBe(testAccessKey)
    })

    it('R2_SECRET_ACCESS_KEYが正しく読み込まれる', async () => {
      const testSecretKey = 'test-secret-key-789'
      process.env.R2_ACCOUNT_ID = 'test-account'
      process.env.R2_ACCESS_KEY_ID = 'test-key'
      process.env.R2_SECRET_ACCESS_KEY = testSecretKey

      mockS3ClientConstructor.mockImplementation(() => ({}))

      const { getR2Client } = await import('../client')
      getR2Client()

      const [config] = mockS3ClientConstructor.mock.calls[0]
      expect(config.credentials.secretAccessKey).toBe(testSecretKey)
    })
  })
})
