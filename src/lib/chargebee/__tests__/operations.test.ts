import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createCustomer,
  getCustomer,
  createSubscription,
  getSubscription,
  cancelSubscription,
  updateSubscription,
  createHostedPage,
  getInvoice,
  listInvoices,
  verifyWebhook,
} from '../operations'

// Chargebee clientをモック
const mockCustomer = {
  create: vi.fn(),
  retrieve: vi.fn(),
}

const mockSubscription = {
  create: vi.fn(),
  retrieve: vi.fn(),
  cancel: vi.fn(),
  update: vi.fn(),
}

const mockHostedPage = {
  checkout_new: vi.fn(),
}

const mockInvoice = {
  retrieve: vi.fn(),
  list: vi.fn(),
}

const mockChargebeeClient = {
  customer: mockCustomer,
  subscription: mockSubscription,
  hosted_page: mockHostedPage,
  invoice: mockInvoice,
}

vi.mock('../client', () => ({
  getChargebeeClient: () => mockChargebeeClient,
}))

describe('Chargebee Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createCustomer', () => {
    it('顧客を作成できる', async () => {
      const mockCustomerData = {
        id: 'cust_123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      }

      mockCustomer.create.mockResolvedValue({
        customer: mockCustomerData,
      })

      const result = await createCustomer({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      })

      expect(mockCustomer.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      })
      expect(result).toEqual(mockCustomerData)
    })

    it('IDを指定して顧客を作成できる', async () => {
      const mockCustomerData = {
        id: 'custom_id_123',
        email: 'test@example.com',
      }

      mockCustomer.create.mockResolvedValue({
        customer: mockCustomerData,
      })

      const result = await createCustomer({
        id: 'custom_id_123',
        email: 'test@example.com',
      })

      expect(mockCustomer.create).toHaveBeenCalledWith({
        id: 'custom_id_123',
        email: 'test@example.com',
      })
      expect(result.id).toBe('custom_id_123')
    })

    it('会社名を含めて顧客を作成できる', async () => {
      mockCustomer.create.mockResolvedValue({
        customer: {
          id: 'cust_456',
          email: 'business@example.com',
          company: 'Test Company',
        },
      })

      const result = await createCustomer({
        email: 'business@example.com',
        company: 'Test Company',
      })

      expect(mockCustomer.create).toHaveBeenCalledWith({
        email: 'business@example.com',
        company: 'Test Company',
      })
      expect(result.company).toBe('Test Company')
    })

    it('メールアドレスのみで顧客を作成できる', async () => {
      mockCustomer.create.mockResolvedValue({
        customer: {
          id: 'cust_789',
          email: 'simple@example.com',
        },
      })

      const result = await createCustomer({
        email: 'simple@example.com',
      })

      expect(mockCustomer.create).toHaveBeenCalledWith({
        email: 'simple@example.com',
      })
      expect(result.email).toBe('simple@example.com')
    })
  })

  describe('getCustomer', () => {
    it('顧客を取得できる', async () => {
      const mockCustomerData = {
        id: 'cust_123',
        email: 'test@example.com',
        first_name: 'Test',
      }

      mockCustomer.retrieve.mockResolvedValue({
        customer: mockCustomerData,
      })

      const result = await getCustomer('cust_123')

      expect(mockCustomer.retrieve).toHaveBeenCalledWith('cust_123')
      expect(result).toEqual(mockCustomerData)
    })

    it('異なる顧客IDで取得できる', async () => {
      mockCustomer.retrieve.mockResolvedValue({
        customer: {
          id: 'cust_456',
          email: 'another@example.com',
        },
      })

      const result = await getCustomer('cust_456')

      expect(mockCustomer.retrieve).toHaveBeenCalledWith('cust_456')
      expect(result.id).toBe('cust_456')
    })
  })

  describe('createSubscription', () => {
    it('サブスクリプションを作成できる', async () => {
      const mockSubscriptionData = {
        id: 'sub_123',
        customer_id: 'cust_123',
        plan_id: 'basic-plan',
      }

      mockSubscription.create.mockResolvedValue({
        subscription: mockSubscriptionData,
      })

      const result = await createSubscription({
        customer_id: 'cust_123',
        plan_id: 'basic-plan',
      })

      expect(mockSubscription.create).toHaveBeenCalledWith({
        customer_id: 'cust_123',
        plan_id: 'basic-plan',
      })
      expect(result).toEqual(mockSubscriptionData)
    })

    it('トライアル期間付きでサブスクリプションを作成できる', async () => {
      const trialEnd = Math.floor(Date.now() / 1000) + 86400 * 14 // 14日後

      mockSubscription.create.mockResolvedValue({
        subscription: {
          id: 'sub_456',
          plan_id: 'premium-plan',
          trial_end: trialEnd,
        },
      })

      const result = await createSubscription({
        plan_id: 'premium-plan',
        trial_end: trialEnd,
      })

      expect(mockSubscription.create).toHaveBeenCalledWith({
        plan_id: 'premium-plan',
        trial_end: trialEnd,
      })
      expect(result.trial_end).toBe(trialEnd)
    })

    it('請求サイクル数を指定してサブスクリプションを作成できる', async () => {
      mockSubscription.create.mockResolvedValue({
        subscription: {
          id: 'sub_789',
          plan_id: 'monthly-plan',
          billing_cycles: 12,
        },
      })

      const result = await createSubscription({
        plan_id: 'monthly-plan',
        billing_cycles: 12,
      })

      expect(mockSubscription.create).toHaveBeenCalledWith({
        plan_id: 'monthly-plan',
        billing_cycles: 12,
      })
      expect(result.billing_cycles).toBe(12)
    })

    it('自動請求をオフにしてサブスクリプションを作成できる', async () => {
      mockSubscription.create.mockResolvedValue({
        subscription: {
          id: 'sub_off',
          plan_id: 'manual-plan',
          auto_collection: 'off',
        },
      })

      const result = await createSubscription({
        plan_id: 'manual-plan',
        auto_collection: 'off',
      })

      expect(mockSubscription.create).toHaveBeenCalledWith({
        plan_id: 'manual-plan',
        auto_collection: 'off',
      })
      expect(result.auto_collection).toBe('off')
    })
  })

  describe('getSubscription', () => {
    it('サブスクリプションを取得できる', async () => {
      const mockSubscriptionData = {
        id: 'sub_123',
        plan_id: 'basic-plan',
        status: 'active',
      }

      mockSubscription.retrieve.mockResolvedValue({
        subscription: mockSubscriptionData,
      })

      const result = await getSubscription('sub_123')

      expect(mockSubscription.retrieve).toHaveBeenCalledWith('sub_123')
      expect(result).toEqual(mockSubscriptionData)
    })

    it('異なるサブスクリプションIDで取得できる', async () => {
      mockSubscription.retrieve.mockResolvedValue({
        subscription: {
          id: 'sub_456',
          status: 'cancelled',
        },
      })

      const result = await getSubscription('sub_456')

      expect(mockSubscription.retrieve).toHaveBeenCalledWith('sub_456')
      expect(result.id).toBe('sub_456')
    })
  })

  describe('cancelSubscription', () => {
    it('サブスクリプションをキャンセルできる', async () => {
      const mockCancelledSubscription = {
        id: 'sub_123',
        status: 'cancelled',
      }

      mockSubscription.cancel.mockResolvedValue({
        subscription: mockCancelledSubscription,
      })

      const result = await cancelSubscription('sub_123')

      expect(mockSubscription.cancel).toHaveBeenCalledWith('sub_123', undefined)
      expect(result).toEqual(mockCancelledSubscription)
    })

    it('期間終了時にキャンセルする設定ができる', async () => {
      mockSubscription.cancel.mockResolvedValue({
        subscription: {
          id: 'sub_456',
          status: 'non_renewing',
        },
      })

      const result = await cancelSubscription('sub_456', {
        end_of_term: true,
      })

      expect(mockSubscription.cancel).toHaveBeenCalledWith('sub_456', {
        end_of_term: true,
      })
      expect(result.status).toBe('non_renewing')
    })

    it('指定日時にキャンセルする設定ができる', async () => {
      const cancelAt = Math.floor(Date.now() / 1000) + 86400 * 30 // 30日後

      mockSubscription.cancel.mockResolvedValue({
        subscription: {
          id: 'sub_789',
          cancel_at: cancelAt,
        },
      })

      const result = await cancelSubscription('sub_789', {
        cancel_at: cancelAt,
      })

      expect(mockSubscription.cancel).toHaveBeenCalledWith('sub_789', {
        cancel_at: cancelAt,
      })
      expect(result.cancel_at).toBe(cancelAt)
    })
  })

  describe('updateSubscription', () => {
    it('サブスクリプションのプランを変更できる', async () => {
      mockSubscription.update.mockResolvedValue({
        subscription: {
          id: 'sub_123',
          plan_id: 'premium-plan',
        },
      })

      const result = await updateSubscription('sub_123', {
        plan_id: 'premium-plan',
      })

      expect(mockSubscription.update).toHaveBeenCalledWith('sub_123', {
        plan_id: 'premium-plan',
      })
      expect(result.plan_id).toBe('premium-plan')
    })

    it('プラン数量を変更できる', async () => {
      mockSubscription.update.mockResolvedValue({
        subscription: {
          id: 'sub_456',
          plan_quantity: 5,
        },
      })

      const result = await updateSubscription('sub_456', {
        plan_quantity: 5,
      })

      expect(mockSubscription.update).toHaveBeenCalledWith('sub_456', {
        plan_quantity: 5,
      })
      expect(result.plan_quantity).toBe(5)
    })

    it('期間終了時に変更を適用する設定ができる', async () => {
      mockSubscription.update.mockResolvedValue({
        subscription: {
          id: 'sub_789',
          plan_id: 'new-plan',
          end_of_term: true,
        },
      })

      const result = await updateSubscription('sub_789', {
        plan_id: 'new-plan',
        end_of_term: true,
      })

      expect(mockSubscription.update).toHaveBeenCalledWith('sub_789', {
        plan_id: 'new-plan',
        end_of_term: true,
      })
      expect(result.end_of_term).toBe(true)
    })
  })

  describe('createHostedPage', () => {
    it('新規チェックアウトページを作成できる', async () => {
      const mockHostedPageData = {
        id: 'hp_123',
        type: 'checkout_new',
        url: 'https://test.chargebee.com/hosted_pages/hp_123',
      }

      mockHostedPage.checkout_new.mockResolvedValue({
        hosted_page: mockHostedPageData,
      })

      const result = await createHostedPage({
        type: 'checkout_new',
        customer: {
          email: 'test@example.com',
        },
        subscription: {
          plan_id: 'basic-plan',
        },
      })

      expect(mockHostedPage.checkout_new).toHaveBeenCalledWith({
        type: 'checkout_new',
        customer: {
          email: 'test@example.com',
        },
        subscription: {
          plan_id: 'basic-plan',
        },
      })
      expect(result).toEqual(mockHostedPageData)
    })

    it('リダイレクトURLを指定してホストページを作成できる', async () => {
      mockHostedPage.checkout_new.mockResolvedValue({
        hosted_page: {
          id: 'hp_456',
          url: 'https://test.chargebee.com/hosted_pages/hp_456',
        },
      })

      const result = await createHostedPage({
        type: 'checkout_new',
        subscription: {
          plan_id: 'premium-plan',
        },
        redirect_url: 'https://myapp.com/success',
        cancel_url: 'https://myapp.com/cancel',
      })

      expect(mockHostedPage.checkout_new).toHaveBeenCalledWith({
        type: 'checkout_new',
        subscription: {
          plan_id: 'premium-plan',
        },
        redirect_url: 'https://myapp.com/success',
        cancel_url: 'https://myapp.com/cancel',
      })
      expect(result.id).toBe('hp_456')
    })

    it('既存顧客のチェックアウトページを作成できる', async () => {
      mockHostedPage.checkout_new.mockResolvedValue({
        hosted_page: {
          id: 'hp_789',
          type: 'checkout_existing',
        },
      })

      const result = await createHostedPage({
        type: 'checkout_existing',
        customer: {
          id: 'cust_123',
        },
        subscription: {
          plan_id: 'upgrade-plan',
        },
      })

      expect(mockHostedPage.checkout_new).toHaveBeenCalledWith({
        type: 'checkout_existing',
        customer: {
          id: 'cust_123',
        },
        subscription: {
          plan_id: 'upgrade-plan',
        },
      })
      expect(result.type).toBe('checkout_existing')
    })

    it('支払い方法管理ページを作成できる', async () => {
      mockHostedPage.checkout_new.mockResolvedValue({
        hosted_page: {
          id: 'hp_manage',
          type: 'manage_payment_sources',
        },
      })

      const result = await createHostedPage({
        type: 'manage_payment_sources',
        customer: {
          id: 'cust_456',
        },
      })

      expect(mockHostedPage.checkout_new).toHaveBeenCalledWith({
        type: 'manage_payment_sources',
        customer: {
          id: 'cust_456',
        },
      })
      expect(result.type).toBe('manage_payment_sources')
    })
  })

  describe('getInvoice', () => {
    it('インボイスを取得できる', async () => {
      const mockInvoiceData = {
        id: 'inv_123',
        customer_id: 'cust_123',
        total: 1000,
        status: 'paid',
      }

      mockInvoice.retrieve.mockResolvedValue({
        invoice: mockInvoiceData,
      })

      const result = await getInvoice('inv_123')

      expect(mockInvoice.retrieve).toHaveBeenCalledWith('inv_123')
      expect(result).toEqual(mockInvoiceData)
    })

    it('異なるインボイスIDで取得できる', async () => {
      mockInvoice.retrieve.mockResolvedValue({
        invoice: {
          id: 'inv_456',
          status: 'pending',
        },
      })

      const result = await getInvoice('inv_456')

      expect(mockInvoice.retrieve).toHaveBeenCalledWith('inv_456')
      expect(result.id).toBe('inv_456')
    })
  })

  describe('listInvoices', () => {
    it('顧客のインボイス一覧を取得できる', async () => {
      const mockInvoiceList = [
        { invoice: { id: 'inv_1', total: 1000 } },
        { invoice: { id: 'inv_2', total: 2000 } },
        { invoice: { id: 'inv_3', total: 3000 } },
      ]

      const mockListObject = {
        list: mockInvoiceList,
        request: vi.fn().mockResolvedValue({
          list: mockInvoiceList,
        }),
      }

      mockInvoice.list.mockReturnValue(mockListObject)

      const result = await listInvoices('cust_123')

      expect(mockInvoice.list).toHaveBeenCalledWith({
        'customer_id[is]': 'cust_123',
      })
      expect(mockListObject.request).toHaveBeenCalled()
      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('inv_1')
      expect(result[1].id).toBe('inv_2')
      expect(result[2].id).toBe('inv_3')
    })

    it('インボイスがない顧客の場合は空配列を返す', async () => {
      const mockListObject = {
        list: [],
        request: vi.fn().mockResolvedValue({
          list: [],
        }),
      }

      mockInvoice.list.mockReturnValue(mockListObject)

      const result = await listInvoices('cust_456')

      expect(result).toHaveLength(0)
      expect(result).toEqual([])
    })

    it('異なる顧客IDでインボイス一覧を取得できる', async () => {
      const mockInvoiceList = [{ invoice: { id: 'inv_new', total: 5000 } }]

      const mockListObject = {
        list: mockInvoiceList,
        request: vi.fn().mockResolvedValue({
          list: mockInvoiceList,
        }),
      }

      mockInvoice.list.mockReturnValue(mockListObject)

      const result = await listInvoices('cust_789')

      expect(mockInvoice.list).toHaveBeenCalledWith({
        'customer_id[is]': 'cust_789',
      })
      expect(result).toHaveLength(1)
      expect(result[0].total).toBe(5000)
    })
  })

  describe('verifyWebhook', () => {
    it('Webhookを検証する（現在は常にtrueを返す）', () => {
      const webhookData = { event_type: 'subscription_created' }
      const signature = 'test_signature'

      const result = verifyWebhook(webhookData, signature)

      expect(result).toBe(true)
    })

    it('異なるWebhookデータでも検証できる', () => {
      const webhookData = { event_type: 'payment_succeeded' }
      const signature = 'another_signature'

      const result = verifyWebhook(webhookData, signature)

      expect(result).toBe(true)
    })

    it('空のWebhookデータでも検証できる', () => {
      const result = verifyWebhook({}, '')

      expect(result).toBe(true)
    })
  })

  describe('エラーハンドリング', () => {
    it('顧客作成エラーをスローする', async () => {
      const error = new Error('顧客作成に失敗しました')
      mockCustomer.create.mockRejectedValue(error)

      await expect(
        createCustomer({
          email: 'error@example.com',
        })
      ).rejects.toThrow('顧客作成に失敗しました')
    })

    it('サブスクリプション取得エラーをスローする', async () => {
      const error = new Error('サブスクリプションが見つかりません')
      mockSubscription.retrieve.mockRejectedValue(error)

      await expect(getSubscription('invalid_sub_id')).rejects.toThrow(
        'サブスクリプションが見つかりません'
      )
    })

    it('インボイスリストエラーをスローする', async () => {
      const error = new Error('インボイスリストの取得に失敗しました')
      const mockListObject = {
        list: [],
        request: vi.fn().mockRejectedValue(error),
      }

      mockInvoice.list.mockReturnValue(mockListObject)

      await expect(listInvoices('error_cust_id')).rejects.toThrow(
        'インボイスリストの取得に失敗しました'
      )
    })
  })

  describe('統合テスト', () => {
    it('顧客作成からサブスクリプション作成までの流れ', async () => {
      // 顧客作成
      mockCustomer.create.mockResolvedValue({
        customer: {
          id: 'cust_integration',
          email: 'integration@example.com',
        },
      })

      const customer = await createCustomer({
        email: 'integration@example.com',
      })

      expect(customer.id).toBe('cust_integration')

      // サブスクリプション作成
      mockSubscription.create.mockResolvedValue({
        subscription: {
          id: 'sub_integration',
          customer_id: 'cust_integration',
          plan_id: 'basic-plan',
        },
      })

      const subscription = await createSubscription({
        customer_id: customer.id,
        plan_id: 'basic-plan',
      })

      expect(subscription.customer_id).toBe('cust_integration')
      expect(mockCustomer.create).toHaveBeenCalledTimes(1)
      expect(mockSubscription.create).toHaveBeenCalledTimes(1)
    })

    it('サブスクリプション更新からキャンセルまでの流れ', async () => {
      // サブスクリプション更新
      mockSubscription.update.mockResolvedValue({
        subscription: {
          id: 'sub_update_cancel',
          plan_id: 'premium-plan',
        },
      })

      const updated = await updateSubscription('sub_update_cancel', {
        plan_id: 'premium-plan',
      })

      expect(updated.plan_id).toBe('premium-plan')

      // サブスクリプションキャンセル
      mockSubscription.cancel.mockResolvedValue({
        subscription: {
          id: 'sub_update_cancel',
          status: 'cancelled',
        },
      })

      const cancelled = await cancelSubscription('sub_update_cancel')

      expect(cancelled.status).toBe('cancelled')
      expect(mockSubscription.update).toHaveBeenCalledTimes(1)
      expect(mockSubscription.cancel).toHaveBeenCalledTimes(1)
    })
  })
})
