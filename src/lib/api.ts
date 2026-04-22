const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:8080'

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
  pending_tasks: number
  pending_appeals: number
  total_revenue: number
  today_revenue: number
}

export interface User {
  id: number
  username: string
  email: string
  phone: string
  role: number
  level: number
  balance: number
  margin_frozen: number
  daily_claim_count: number
  daily_claim_reset: string
  status: number
  credit_score: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: number
  business_id: number
  title: string
  description: string
  cover_image: string
  unit_price: number
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
  task_id: number
  claim_id: number
  user_id: number
  type: number
  reason: string
  status: number
  handle_at: string
  handle_by: number
  created_at: string
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

    const response = await fetch(`${API_BASE}${endpoint}`, {
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
  async getUsers(params?: { page?: number; page_size?: number; status?: number; role?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.page_size) searchParams.set('page_size', String(params.page_size))
    if (params?.status !== undefined) searchParams.set('status', String(params.status))
    if (params?.role !== undefined) searchParams.set('role', String(params.role))
    return this.request<{ users: User[]; total: number }>(`/api/v1/admin/users?${searchParams}`)
  }

  async getUserDetail(id: number) {
    return this.request<{ user: User }>(`/api/v1/admin/users/${id}`)
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

  async updateUserBalance(id: number, balance: number) {
    return this.request<void>(`/api/v1/admin/users/${id}/balance`, {
      method: 'PUT',
      body: JSON.stringify({ balance }),
    })
  }

  // Tasks
  async getTasks(params?: { page?: number; page_size?: number; status?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.page_size) searchParams.set('page_size', String(params.page_size))
    if (params?.status !== undefined) searchParams.set('status', String(params.status))
    return this.request<{ tasks: Task[]; total: number }>(`/api/v1/admin/tasks?${searchParams}`)
  }

  async getTaskDetail(id: number) {
    return this.request<{ task: Task }>(`/api/v1/admin/tasks/${id}`)
  }

  async updateTask(id: number, data: Partial<Task>) {
    return this.request<void>(`/api/v1/admin/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async reviewTask(id: number, status: number) {
    return this.request<void>(`/api/v1/admin/task/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  }

  // Works
  async getWorks(params?: { page?: number; page_size?: number; status?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.page_size) searchParams.set('page_size', String(params.page_size))
    if (params?.status !== undefined) searchParams.set('status', String(params.status))
    return this.request<{ works: Work[]; total: number }>(`/api/v1/admin/works?${searchParams}`)
  }

  async getWorkDetail(id: number) {
    return this.request<{ work: Work }>(`/api/v1/admin/works/${id}`)
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
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.page_size) searchParams.set('page_size', String(params.page_size))
    if (params?.status !== undefined) searchParams.set('status', String(params.status))
    return this.request<{ appeals: Appeal[]; total: number }>(`/api/v1/admin/appeals?${searchParams}`)
  }

  async getAppealDetail(id: number) {
    return this.request<{ appeal: Appeal }>(`/api/v1/admin/appeals/${id}`)
  }

  async handleAppeal(id: number, status: number, reply: string) {
    return this.request<void>(`/api/v1/admin/appeals/${id}/handle`, {
      method: 'PUT',
      body: JSON.stringify({ status, reply }),
    })
  }

  // Inspirations
  async getInspirations(params?: { page?: number; page_size?: number; status?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.page_size) searchParams.set('page_size', String(params.page_size))
    if (params?.status !== undefined) searchParams.set('status', String(params.status))
    return this.request<{ inspirations: Inspiration[]; total: number }>(`/api/v1/admin/inspirations?${searchParams}`)
  }

  async getInspirationDetail(id: number) {
    return this.request<{ inspiration: Inspiration }>(`/api/v1/admin/inspirations/${id}`)
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
    return this.request<Record<string, string>>('/api/v1/admin/settings')
  }

  async updateSettings(settings: Record<string, string>) {
    return this.request<void>('/api/v1/admin/settings', {
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
}

export const api = new ApiClient()
export { API_BASE }
