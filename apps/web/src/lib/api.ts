const API_BASE = '/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    this.setToken(data.accessToken);
    return data;
  }

  async register(email: string, username: string, password: string, fullName: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: { email, username, password, fullName },
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // Customers
  async getCustomers() {
    return this.request('/customers');
  }

  async getCustomer(id: string) {
    return this.request(`/customers/${id}`);
  }

  async createCustomer(data: unknown) {
    return this.request('/customers', { method: 'POST', body: data });
  }

  async updateCustomer(id: string, data: unknown) {
    return this.request(`/customers/${id}`, { method: 'PUT', body: data });
  }

  async deleteCustomer(id: string) {
    return this.request(`/customers/${id}`, { method: 'DELETE' });
  }

  // Quotes
  async getQuotes() {
    return this.request('/quotes');
  }

  async getQuote(id: string) {
    return this.request(`/quotes/${id}`);
  }

  async createQuote(data: unknown) {
    return this.request('/quotes', { method: 'POST', body: data });
  }

  async updateQuote(id: string, data: unknown) {
    return this.request(`/quotes/${id}`, { method: 'PUT', body: data });
  }

  async deleteQuote(id: string) {
    return this.request(`/quotes/${id}`, { method: 'DELETE' });
  }

  // Orders
  async getOrders() {
    return this.request('/orders');
  }

  async getOrder(id: string) {
    return this.request(`/orders/${id}`);
  }

  async createOrder(data: unknown) {
    return this.request('/orders', { method: 'POST', body: data });
  }

  async updateOrder(id: string, data: unknown) {
    return this.request(`/orders/${id}`, { method: 'PUT', body: data });
  }

  async deleteOrder(id: string) {
    return this.request(`/orders/${id}`, { method: 'DELETE' });
  }

  // Discoveries
  async getDiscoveries() {
    return this.request('/discoveries');
  }

  async getDiscovery(id: string) {
    return this.request(`/discoveries/${id}`);
  }

  async createDiscovery(data: unknown) {
    return this.request('/discoveries', { method: 'POST', body: data });
  }

  async updateDiscovery(id: string, data: unknown) {
    return this.request(`/discoveries/${id}`, { method: 'PUT', body: data });
  }

  async deleteDiscovery(id: string) {
    return this.request(`/discoveries/${id}`, { method: 'DELETE' });
  }

  // Personnel
  async getPersonnel() {
    return this.request('/personnel');
  }

  async getPersonnelById(id: string) {
    return this.request(`/personnel/${id}`);
  }

  async createPersonnel(data: unknown) {
    return this.request('/personnel', { method: 'POST', body: data });
  }

  async updatePersonnel(id: string, data: unknown) {
    return this.request(`/personnel/${id}`, { method: 'PUT', body: data });
  }

  async deletePersonnel(id: string) {
    return this.request(`/personnel/${id}`, { method: 'DELETE' });
  }

  // Inventory
  async getInventory() {
    return this.request('/inventory');
  }

  async createInventory(data: unknown) {
    return this.request('/inventory', { method: 'POST', body: data });
  }

  async updateInventory(id: string, data: unknown) {
    return this.request(`/inventory/${id}`, { method: 'PUT', body: data });
  }

  async getStockAlerts() {
    return this.request('/inventory/alerts');
  }

  // Finance
  async getAccounts() {
    return this.request('/finance/accounts');
  }

  async getAccount(id: string) {
    return this.request(`/finance/accounts/${id}`);
  }

  async createAccount(data: unknown) {
    return this.request('/finance/accounts', { method: 'POST', body: data });
  }

  async updateAccount(id: string, data: unknown) {
    return this.request(`/finance/accounts/${id}`, { method: 'PUT', body: data });
  }

  async createExpense(data: unknown) {
    return this.request('/finance/expenses', { method: 'POST', body: data });
  }

  async createIncome(data: unknown) {
    return this.request('/finance/income', { method: 'POST', body: data });
  }

  async getExpenses() {
    return this.request('/finance/expenses');
  }

  async getIncome() {
    return this.request('/finance/income');
  }
}

export const api = new ApiClient();
export default api;