import type { User } from '@/types';

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
  async login(email: string, password: string): Promise<{ accessToken: string; tokenType: string }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async register(email: string, username: string, password: string, fullName: string): Promise<void> {
    return this.request('/auth/register', {
      method: 'POST',
      body: { email, username, password, fullName },
    });
  }

  async getMe(): Promise<User> {
    return this.request('/auth/me');
  }

  // Customers
  async getCustomers(params?: { search?: string; customerType?: string; page?: number; pageSize?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.customerType) queryParams.append('customerType', params.customerType);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.pageSize) queryParams.append('pageSize', String(params.pageSize));
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request(`/customers${query}`);
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

  async updateCustomerBalance(id: string, amount: number) {
    return this.request(`/customers/${id}/balance`, { method: 'PATCH', body: { amount } });
  }

  async addCustomerContact(customerId: string, contact: unknown) {
    return this.request(`/customers/${customerId}/contacts`, { method: 'POST', body: contact });
  }

  async updateCustomerContact(customerId: string, contactId: string, contact: unknown) {
    return this.request(`/customers/${customerId}/contacts/${contactId}`, { method: 'PUT', body: contact });
  }

  async deleteCustomerContact(customerId: string, contactId: string) {
    return this.request(`/customers/${customerId}/contacts/${contactId}`, { method: 'DELETE' });
  }

  async addCustomerAddress(customerId: string, address: unknown) {
    return this.request(`/customers/${customerId}/addresses`, { method: 'POST', body: address });
  }

  async updateCustomerAddress(customerId: string, addressId: string, address: unknown) {
    return this.request(`/customers/${customerId}/addresses/${addressId}`, { method: 'PUT', body: address });
  }

  async deleteCustomerAddress(customerId: string, addressId: string) {
    return this.request(`/customers/${customerId}/addresses/${addressId}`, { method: 'DELETE' });
  }

  async addCustomerBankAccount(customerId: string, bankAccount: unknown) {
    return this.request(`/customers/${customerId}/bank-accounts`, { method: 'POST', body: bankAccount });
  }

  async updateCustomerBankAccount(customerId: string, bankAccountId: string, bankAccount: unknown) {
    return this.request(`/customers/${customerId}/bank-accounts/${bankAccountId}`, { method: 'PUT', body: bankAccount });
  }

  async deleteCustomerBankAccount(customerId: string, bankAccountId: string) {
    return this.request(`/customers/${customerId}/bank-accounts/${bankAccountId}`, { method: 'DELETE' });
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

  async approveQuote(id: string) {
    return this.request(`/quotes/${id}/approve`, { method: 'POST' });
  }

  async rejectQuote(id: string, reason?: string) {
    return this.request(`/quotes/${id}/reject`, { method: 'POST', body: { reason } });
  }

  async copyQuote(id: string) {
    return this.request(`/quotes/${id}/copy`, { method: 'POST' });
  }

  async convertQuoteToOrder(id: string) {
    return this.request(`/quotes/${id}/convert-to-order`, { method: 'POST' });
  }

  async getQuotePDFData(id: string) {
    return this.request(`/quotes/${id}/pdf`);
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
  async getDiscoveries(params?: { status?: string; customerId?: string; priority?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.customerId) queryParams.append('customerId', params.customerId);
    if (params?.priority) queryParams.append('priority', params.priority);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request(`/discoveries${query}`);
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

  async updateDiscoveryStage(id: string, status: string) {
    return this.request(`/discoveries/${id}/stage`, { method: 'PATCH', body: { status } });
  }

  async deleteDiscovery(id: string) {
    return this.request(`/discoveries/${id}`, { method: 'DELETE' });
  }

  async convertDiscoveryToOrder(id: string) {
    return this.request(`/discoveries/${id}/convert-to-order`, { method: 'POST' });
  }

  async searchCustomers(q: string) {
    return this.request(`/discoveries/customers/search?q=${encodeURIComponent(q)}`);
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

  // Products
  async getProducts(params?: { category?: string; location?: string; search?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.location) queryParams.append('location', params.location);
    if (params?.search) queryParams.append('search', params.search);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request(`/inventory/products${query}`);
  }

  async getProduct(id: string) {
    return this.request(`/inventory/products/${id}`);
  }

  async createProduct(data: unknown) {
    return this.request('/inventory/products', { method: 'POST', body: data });
  }

  async updateProduct(id: string, data: unknown) {
    return this.request(`/inventory/products/${id}`, { method: 'PUT', body: data });
  }

  async deleteProduct(id: string) {
    return this.request(`/inventory/products/${id}`, { method: 'DELETE' });
  }

  // Stock Movements
  async getStockMovements(params?: { productId?: string; movementType?: string; startDate?: string; endDate?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.productId) queryParams.append('productId', params.productId);
    if (params?.movementType) queryParams.append('movementType', params.movementType);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request(`/inventory/movements${query}`);
  }

  async createStockMovement(data: unknown) {
    return this.request('/inventory/movements', { method: 'POST', body: data });
  }

  // Warehouses
  async getWarehouses() {
    return this.request('/inventory/warehouses');
  }

  async createWarehouse(data: unknown) {
    return this.request('/inventory/warehouses', { method: 'POST', body: data });
  }

  async updateWarehouse(id: string, data: unknown) {
    return this.request(`/inventory/warehouses/${id}`, { method: 'PUT', body: data });
  }

  // Stocktakes
  async getStocktakes(params?: { status?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request(`/inventory/stocktakes${query}`);
  }

  async getStocktake(id: string) {
    return this.request(`/inventory/stocktakes/${id}`);
  }

  async createStocktake(data: unknown) {
    return this.request('/inventory/stocktakes', { method: 'POST', body: data });
  }

  async updateStocktake(id: string, data: unknown) {
    return this.request(`/inventory/stocktakes/${id}`, { method: 'PUT', body: data });
  }

  async completeStocktake(id: string) {
    return this.request(`/inventory/stocktakes/${id}/complete`, { method: 'POST' });
  }

  // Inventory Valuation
  async getInventoryValuation() {
    return this.request('/inventory/valuation');
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

  async deleteAccount(id: string) {
    return this.request(`/finance/accounts/${id}`, { method: 'DELETE' });
  }

  // Categories
  async getCategories() {
    return this.request('/finance/categories');
  }

  async createCategory(data: unknown) {
    return this.request('/finance/categories', { method: 'POST', body: data });
  }

  async deleteCategory(id: string) {
    return this.request(`/finance/categories/${id}`, { method: 'DELETE' });
  }

  // Transactions
  async getTransactions(params?: {
    accountId?: string;
    type?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.accountId) queryParams.append('accountId', params.accountId);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request(`/finance/transactions${query}`);
  }

  async getTransaction(id: string) {
    return this.request(`/finance/transactions/${id}`);
  }

  async createTransaction(data: unknown) {
    return this.request('/finance/transactions', { method: 'POST', body: data });
  }

  async deleteTransaction(id: string) {
    return this.request(`/finance/transactions/${id}`, { method: 'DELETE' });
  }

  // Recurring Transactions
  async getRecurringTransactions() {
    return this.request('/finance/recurring');
  }

  async createRecurringTransaction(data: unknown) {
    return this.request('/finance/recurring', { method: 'POST', body: data });
  }

  async updateRecurringTransaction(id: string, data: unknown) {
    return this.request(`/finance/recurring/${id}`, { method: 'PUT', body: data });
  }

  async deleteRecurringTransaction(id: string) {
    return this.request(`/finance/recurring/${id}`, { method: 'DELETE' });
  }

  async processRecurringTransaction(id: string) {
    return this.request(`/finance/recurring/${id}/process`, { method: 'POST' });
  }

  // Finance Summary
  async getFinanceSummary() {
    return this.request('/finance/summary');
  }

  // Legacy endpoints
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

  // Suppliers
  async getSuppliers(params?: { search?: string; page?: number; pageSize?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.pageSize) queryParams.append('pageSize', String(params.pageSize));
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request(`/purchasing/suppliers${query}`);
  }

  async getSupplier(id: string) {
    return this.request(`/purchasing/suppliers/${id}`);
  }

  async createSupplier(data: unknown) {
    return this.request('/purchasing/suppliers', { method: 'POST', body: data });
  }

  async updateSupplier(id: string, data: unknown) {
    return this.request(`/purchasing/suppliers/${id}`, { method: 'PUT', body: data });
  }

  async deleteSupplier(id: string) {
    return this.request(`/purchasing/suppliers/${id}`, { method: 'DELETE' });
  }

  async addSupplierContact(supplierId: string, contact: unknown) {
    return this.request(`/purchasing/suppliers/${supplierId}/contacts`, { method: 'POST', body: contact });
  }

  async deleteSupplierContact(supplierId: string, contactId: string) {
    return this.request(`/purchasing/suppliers/${supplierId}/contacts/${contactId}`, { method: 'DELETE' });
  }

  // Purchase Orders
  async getPurchaseOrders(params?: { search?: string; status?: string; supplierId?: string; page?: number; pageSize?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.supplierId) queryParams.append('supplierId', params.supplierId);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.pageSize) queryParams.append('pageSize', String(params.pageSize));
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request(`/purchasing/purchase-orders${query}`);
  }

  async getPurchaseOrder(id: string) {
    return this.request(`/purchasing/purchase-orders/${id}`);
  }

  async createPurchaseOrder(data: unknown) {
    return this.request('/purchasing/purchase-orders', { method: 'POST', body: data });
  }

  async updatePurchaseOrder(id: string, data: unknown) {
    return this.request(`/purchasing/purchase-orders/${id}`, { method: 'PUT', body: data });
  }

  async updatePOStatus(id: string, status: string) {
    return this.request(`/purchasing/purchase-orders/${id}/status`, { method: 'PATCH', body: { status } });
  }

  async receivePOItems(id: string, items: Array<{ itemId: string; receivedQuantity: number }>) {
    return this.request(`/purchasing/purchase-orders/${id}/receive`, { method: 'POST', body: { items } });
  }

  async deletePurchaseOrder(id: string) {
    return this.request(`/purchasing/purchase-orders/${id}`, { method: 'DELETE' });
  }

  // Supplier Quotes
  async getSupplierQuotes(params?: { search?: string; supplierId?: string; productId?: string; status?: string; page?: number; pageSize?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.supplierId) queryParams.append('supplierId', params.supplierId);
    if (params?.productId) queryParams.append('productId', params.productId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.pageSize) queryParams.append('pageSize', String(params.pageSize));
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request(`/purchasing/supplier-quotes${query}`);
  }

  async getSupplierQuote(id: string) {
    return this.request(`/purchasing/supplier-quotes/${id}`);
  }

  async createSupplierQuote(data: unknown) {
    return this.request('/purchasing/supplier-quotes', { method: 'POST', body: data });
  }

  async updateSupplierQuote(id: string, data: unknown) {
    return this.request(`/purchasing/supplier-quotes/${id}`, { method: 'PUT', body: data });
  }

  async updateSupplierQuoteStatus(id: string, status: string) {
    return this.request(`/purchasing/supplier-quotes/${id}/status`, { method: 'PATCH', body: { status } });
  }

  async deleteSupplierQuote(id: string) {
    return this.request(`/purchasing/supplier-quotes/${id}`, { method: 'DELETE' });
  }

  async compareSupplierQuotes(productId: string) {
    return this.request(`/purchasing/supplier-quotes/compare/${productId}`);
  }

  async convertQuoteToPO(quoteId: string) {
    return this.request(`/purchasing/supplier-quotes/${quoteId}/convert-to-po`, { method: 'POST' });
  }

  // ==================== PRODUCTION ====================

  // BOM
  async getBOMs() {
    return this.request('/production/bom');
  }

  async getBOM(id: string) {
    return this.request(`/production/bom/${id}`);
  }

  async createBOM(data: unknown) {
    return this.request('/production/bom', { method: 'POST', body: data });
  }

  async updateBOM(id: string, data: unknown) {
    return this.request(`/production/bom/${id}`, { method: 'PUT', body: data });
  }

  async deleteBOM(id: string) {
    return this.request(`/production/bom/${id}`, { method: 'DELETE' });
  }

  // Production Orders
  async getProductionOrders() {
    return this.request('/production/orders');
  }

  async getProductionOrder(id: string) {
    return this.request(`/production/orders/${id}`);
  }

  async createProductionOrder(data: unknown) {
    return this.request('/production/orders', { method: 'POST', body: data });
  }

  async updateProductionOrder(id: string, data: unknown) {
    return this.request(`/production/orders/${id}`, { method: 'PUT', body: data });
  }

  async deleteProductionOrder(id: string) {
    return this.request(`/production/orders/${id}`, { method: 'DELETE' });
  }

  // Projects
  async getProjects() {
    return this.request('/production/projects');
  }

  async getProject(id: string) {
    return this.request(`/production/projects/${id}`);
  }

  async createProject(data: unknown) {
    return this.request('/production/projects', { method: 'POST', body: data });
  }

  async updateProject(id: string, data: unknown) {
    return this.request(`/production/projects/${id}`, { method: 'PUT', body: data });
  }

  async deleteProject(id: string) {
    return this.request(`/production/projects/${id}`, { method: 'DELETE' });
  }

  // Project Tasks
  async createProjectTask(projectId: string, data: unknown) {
    return this.request(`/production/projects/${projectId}/tasks`, { method: 'POST', body: data });
  }

  async updateProjectTask(projectId: string, taskId: string, data: unknown) {
    return this.request(`/production/projects/${projectId}/tasks/${taskId}`, { method: 'PUT', body: data });
  }

  async deleteProjectTask(projectId: string, taskId: string) {
    return this.request(`/production/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
export default api;