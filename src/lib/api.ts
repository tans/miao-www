const isDev = import.meta.env.DEV
const API_BASE = import.meta.env.PUBLIC_API_URL || 'https://miao-test.clawos.cc'

export function resolveAssetUrl(raw?: string | null) {
  const value = (raw || '').trim()
  if (!value) return ''
  const lower = value.toLowerCase()
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('data:') ||
    lower.startsWith('wxfile://') ||
    lower.startsWith('cloud://')
  ) {
    return value
  }
  if (value.startsWith('/')) {
    return `${API_BASE}${value}`
  }
  return `${API_BASE}/${value}`
}

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface DashboardStats {
  total_users: number
  total_tasks: number
  active_tasks: number
  total_works: number
  total_inspirations: number
  total_appeals: number
  pending_tasks: number
  pending_appeals: number
  total_revenue: number
  today_revenue: number
  // API actual fields
  total_claims: number
  total_transaction_amount: number
  total_admins: number
}

export interface User {
  id: number
  username: string
  email?: string
  phone: string
  nickname?: string
  avatar?: string
  role: number | string
  level?: number
  level_name?: string
  balance: number
  frozen_amount?: number
  margin_frozen?: number
  real_name_verified?: boolean
  business_verified?: boolean
  adopted_count?: number
  report_count?: number
  daily_claim_count?: number
  daily_claim_reset?: string
  status: number
  credit_score?: number
  created_at: string
  updated_at?: string
}

export interface Task {
  id: number
  business_id: number
  title: string
  description: string
  cover_image: string
  unit_price: number
  total_count?: number
  total_budget: number
  remaining_count: number
  claimed_count: number
  submitted_count: number
  paid_amount: number
  status: number
  review_deadline_at: string
  end_at: string
  created_at: string
  updated_at: string
}

export interface Claim {
  id: number
  task_id: number
  task_title?: string
  task?: {
    id?: number
    title?: string
  }
  creator_id: number
  creator_name?: string
  creator?: {
    id?: number
    username?: string
    avatar?: string
  }
  business_id?: number
  business_name?: string
  business?: {
    id?: number
    username?: string
  }
  status: number
  status_str?: string
  content: string
  submit_at?: string
  expires_at?: string
  review_at?: string
  review_result?: number | null
  review_result_str?: string
  review_comment?: string
  creator_reward?: number
  platform_fee?: number
  margin_returned?: number
  created_at: string
  updated_at?: string
  materials?: Array<{
    id?: number
    file_name?: string
    file_path: string
    file_type?: string
    thumbnail_path?: string
    created_at?: string
  }>
}

export interface TaskDetail extends Task {
  business_name?: string
  deadline?: string
  reject_reason?: string
  industries?: string[]
  styles?: string[]
  claim_count?: number
  submit_count?: number
  approved_count?: number
  claims?: Claim[]
  reward?: number
}

export interface UserDetailResponse {
  user: User & {
    role: string | number
    is_disabled?: boolean
    is_admin?: boolean
    created_tasks_count?: number
    claimed_tasks_count?: number
    submitted_works_count?: number
  }
  created_tasks: {
    tasks: Task[]
    total: number
    page: number
    page_size: number
  }
  participated_tasks: {
    claims: Claim[]
    total: number
    page: number
    page_size: number
  }
  submitted_works: {
    works: Claim[]
    total: number
    page: number
    page_size: number
  }
}

export interface Work {
  id: number
  task_id: number
  claim_id: number
  creator_id: number
  content: string
  images: string[]
  videos: string[]
  status: number
  review_result: number
  review_at: string
  created_at: string
}

export interface Appeal {
  id: number
  task_id?: number
  claim_id?: number
  user_id: number
  type: number
  reason: string
  status: number
  handle_at?: string
  handle_by?: number
  created_at: string
  target_id?: number
  result?: string
}

export interface Inspiration {
  id: number
  business_id: number
  creator_id: number
  title: string
  content: string
  cover_url: string
  cover_type: string
  source_claim_id: number
  status: number
  likes: number
  created_at: string
  updated_at: string
}

export interface AISettings {
  ai_api_key: string
  ai_api_endpoint: string
  ai_model: string
  ocr_access_key_id: string
  ocr_access_key_secret: string
  ocr_endpoint: string
  ocr_security_token: string
}

export interface SystemSettings {
  review_days: number
  submit_days: number
  grace_days: number
  report_action: number
  min_unit_price: number
  min_award_price: number
  help_center_doc_url: string
}

export interface MerchantAuthApplication {
  id: number
  user_id: number
  username: string
  phone: string
  company_name: string
  credit_code: string
  contact_name: string
  contact_phone: string
  license_url: string
  license_preview_url: string
  status: number
  status_text: string
  review_comment: string
  reviewed_at: string
  created_at: string
  updated_at: string
  business_verified: boolean
  auto_approve_at: string
  auto_approve_in_minutes: number
}

class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('admin_token', token)
    } else {
      localStorage.removeItem('admin_token')
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('admin_token')
    }
    return this.token
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    }

    const url = isDev ? endpoint : `${API_BASE}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers,
    })

    return response.json()
  }

  // Auth
  async adminLogin(username: string, password: string) {
    return this.request<{ token: string; user: User }>('/api/v1/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  }

  async adminRegister(username: string, password: string) {
    return this.request<{ token: string; user: User }>('/api/v1/admin/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  }

  // Dashboard
  async getDashboard() {
    return this.request<DashboardStats>('/api/v1/admin/dashboard')
  }

  async getStats() {
    return this.request<DashboardStats>('/api/v1/admin/stats')
  }

  // Users
  async getUsers(params?: { page?: number; page_size?: number; status?: number | string; role?: string; keyword?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.page_size) searchParams.set('page_size', String(params.page_size))
    if (params?.status !== undefined) searchParams.set('status', String(params.status))
    if (params?.role) searchParams.set('role', params.role)
    if (params?.keyword) searchParams.set('search', params.keyword)
    return this.request<{ users: User[]; total: number }>(`/api/v1/admin/users?${searchParams}`)
  }

  async getUserDetail(id: number) {
    return this.request<UserDetailResponse>(`/api/v1/admin/users/${id}`)
  }

  async updateUserStatus(id: number, status: number) {
    return this.request<void>(`/api/v1/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  }

  async updateUserCredit(id: number, creditScore: number) {
    return this.request<void>(`/api/v1/admin/users/${id}/credit`, {
      method: 'PUT',
      body: JSON.stringify({ credit_score: creditScore }),
    })
  }

  async updateUserBalance(id: number, change: number, reason: string) {
    return this.request<void>(`/api/v1/admin/users/${id}/balance`, {
      method: 'PUT',
      body: JSON.stringify({ change, reason }),
    })
  }

  async getMerchantAuthApplications(params?: { page?: number; page_size?: number; status?: string; keyword?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.page_size) searchParams.set('page_size', String(params.page_size))
    if (params?.status) searchParams.set('status', params.status)
    if (params?.keyword) searchParams.set('search', params.keyword)
    return this.request<{ items: MerchantAuthApplication[]; total: number; page: number; page_size: number }>(`/api/v1/admin/merchant-auth?${searchParams}`)
  }

  async reviewMerchantAuth(userId: number, approved: boolean, comment?: string) {
    return this.request<void>(`/api/v1/admin/merchant-auth/${userId}/review`, {
      method: 'PUT',
      body: JSON.stringify({ approved, comment: comment || '' }),
    })
  }

  async updateMerchantAuthStatus(userId: number, status: number, comment?: string) {
    return this.request<void>(`/api/v1/admin/merchant-auth/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, comment: comment || '' }),
    })
  }

  async deleteMerchantAuth(userId: number) {
    return this.request<void>(`/api/v1/admin/merchant-auth/${userId}`, {
      method: 'DELETE',
    })
  }

  // Tasks
  async getUserTransactions(id: number) {
    return this.request<{ transactions: unknown[] }>(`/api/v1/admin/users/${id}/transactions`)
  }

  // Tasks
  async getTasks(params?: { page?: number; page_size?: number; status?: number | string; keyword?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.page_size) searchParams.set('page_size', String(params.page_size))
    if (params?.status !== undefined) searchParams.set('status', String(params.status))
    if (params?.keyword) searchParams.set('search', params.keyword)
    return this.request<{ tasks: Task[]; total: number }>(`/api/v1/admin/tasks?${searchParams}`)
  }

  async getTaskDetail(id: number) {
    return this.request<TaskDetail>(`/api/v1/admin/tasks/${id}`)
  }

  async updateTask(id: number, data: Partial<Task>) {
    return this.request<void>(`/api/v1/admin/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async reviewTask(id: number, approved: boolean, comment?: string) {
    return this.request<void>(`/api/v1/admin/tasks/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ approved, comment: comment || "" }),
    })
  }

  async getWorks(params?: { page?: number; page_size?: number; status?: number; keyword?: string | number }) {
    const searchParams = new URLSearchParams()
    const page = params?.page || 1
    const pageSize = params?.page_size || 20
    searchParams.set('limit', String(pageSize))
    searchParams.set('offset', String((page - 1) * pageSize))
    if (params?.status !== undefined) searchParams.set('status', String(params.status))
    if (params?.keyword !== undefined) searchParams.set('keyword', String(params.keyword))
    return this.request<{ works: Work[]; total: number }>(`/api/v1/admin/works?${searchParams}`)
  }

  async getWorkDetail(id: number) {
    return this.request<Work>(`/api/v1/admin/works/${id}`)
  }

  async updateWork(id: number, data: Partial<Work>) {
    return this.request<void>(`/api/v1/admin/works/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteWork(id: number) {
    return this.request<void>(`/api/v1/admin/works/${id}`, {
      method: 'DELETE',
    })
  }

  // Appeals
  async getAppeals(params?: { page?: number; page_size?: number; status?: number }) {
    const searchParams = new URLSearchParams()
    const page = params?.page || 1
    const pageSize = params?.page_size || 20
    searchParams.set('limit', String(pageSize))
    searchParams.set('offset', String((page - 1) * pageSize))
    if (params?.status !== undefined) searchParams.set('status', String(params.status))
    return this.request<{ appeals: Appeal[]; total: number }>(`/api/v1/admin/appeals?${searchParams}`)
  }

  async getAppealDetail(id: number) {
    return this.request<Appeal>(`/api/v1/admin/appeals/${id}`)
  }

  async handleAppeal(
    id: number,
    accepted: boolean,
    result: string,
    comment: string,
    action?: 'adopt' | 'eliminate' | 'reject'
  ) {
    return this.request<void>(`/api/v1/admin/appeals/${id}/handle`, {
      method: 'PUT',
      body: JSON.stringify({ accepted, result, comment, action }),
    })
  }

  // Inspirations
  async getInspirations(params?: { page?: number; page_size?: number; status?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.page_size) searchParams.set('page_size', String(params.page_size))
    if (params?.status !== undefined) searchParams.set('status', String(params.status))
    return this.request<{ items: Inspiration[]; inspirations?: Inspiration[]; total: number }>(`/api/v1/admin/inspirations?${searchParams}`)
  }

  async getInspirationDetail(id: number) {
    return this.request<Inspiration>(`/api/v1/admin/inspirations/${id}`)
  }

  async createInspiration(data: Partial<Inspiration>) {
    return this.request<{ inspiration: Inspiration }>('/api/v1/admin/inspirations', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateInspiration(id: number, data: Partial<Inspiration>) {
    return this.request<void>(`/api/v1/admin/inspirations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteInspiration(id: number) {
    return this.request<void>(`/api/v1/admin/inspirations/${id}`, {
      method: 'DELETE',
    })
  }

  // Finance
  async getFinanceStats() {
    return this.request<{
      total_revenue: number
      today_revenue: number
      total_transactions: number
    }>('/api/v1/admin/finance/stats')
  }

  async getFinanceTransactions(params?: { page?: number; page_size?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.page_size) searchParams.set('page_size', String(params.page_size))
    return this.request<{ transactions: unknown[]; total: number }>(`/api/v1/admin/finance/transactions?${searchParams}`)
  }

  // Settings
  async getSettings() {
    return this.request<SystemSettings>('/api/v1/admin/settings')
  }

  async updateSettings(settings: Partial<SystemSettings>) {
    return this.request<SystemSettings>('/api/v1/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  }

  async getAISettings() {
    return this.request<AISettings>('/api/v1/admin/ai-settings')
  }

  async updateAISettings(settings: AISettings) {
    return this.request<AISettings>('/api/v1/admin/ai-settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  }

  // Database
  async getTables() {
    return this.request<{ tables: string[] }>('/api/v1/admin/tables')
  }

  async getTableSchema(table: string) {
    return this.request<{ schema: unknown }>(`/api/v1/admin/tables/${table}/schema`)
  }

  async executeQuery(sql: string) {
    return this.request<{ result: unknown }>('/api/v1/admin/query', {
      method: 'POST',
      body: JSON.stringify({ sql }),
    })
  }

  // Categories
  async getCategories() {
    return this.request<{ categories: unknown[] }>('/api/v1/admin/categories')
  }

  async createCategory(data: { name: string; icon?: string; sort_order?: number }) {
    return this.request<{ category: unknown }>('/api/v1/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCategory(id: number, data: { name?: string; icon?: string; sort_order?: number }) {
    return this.request<void>(`/api/v1/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteCategory(id: number) {
    return this.request<void>(`/api/v1/admin/categories/${id}`, {
      method: 'DELETE',
    })
  }

  // Notifications
  async getNotifications(params?: { page?: number; page_size?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.page_size) searchParams.set('page_size', String(params.page_size))
    return this.request<{ notifications: unknown[]; total: number }>(`/api/v1/admin/notifications?${searchParams}`)
  }

  async sendNotification(data: { title: string; content: string; target_type: 'all' | 'creators' | 'businesses' | 'user'; user_id?: number }) {
    return this.request<void>('/api/v1/admin/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Claims
  async getClaims(params?: { page?: number; page_size?: number; status?: number; task_id?: number; creator_id?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.page_size) searchParams.set('page_size', String(params.page_size))
    if (params?.status !== undefined) searchParams.set('status', String(params.status))
    if (params?.task_id) searchParams.set('task_id', String(params.task_id))
    if (params?.creator_id) searchParams.set('creator_id', String(params.creator_id))
    return this.request<{ claims?: Claim[]; data?: Claim[]; total?: number; page?: number; limit?: number } | Claim[]>(`/api/v1/admin/claims?${searchParams}`)
  }

  async getClaimDetail(id: number) {
    return this.request<{ claim: Claim } | Claim>(`/api/v1/admin/claims/${id}`)
  }
}

export const api = new ApiClient()
export { API_BASE, isDev }
