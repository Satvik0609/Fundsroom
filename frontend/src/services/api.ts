import type { User, Customer, FollowUp, Product, StockMovement, SalesChallan, DashboardStats, Pagination } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      throw { status: res.status, ...data };
    }

    return data;
  }

  login(email: string, password: string) {
    return this.request<{ success: boolean; data: { token: string; user: User } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
  }

  me() {
    return this.request<{ success: boolean; data: User }>('/auth/me');
  }

  getDashboard() {
    return this.request<{ success: boolean; data: DashboardStats }>('/dashboard');
  }

  getCustomers(page = 1, limit = 10, search = '') {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    return this.request<{ success: boolean; data: Customer[]; pagination: Pagination }>(
      `/customers?${params}`
    );
  }

  getCustomer(id: string) {
    return this.request<{ success: boolean; data: Customer }>(`/customers/${id}`);
  }

  createCustomer(data: Record<string, unknown>) {
    return this.request<{ success: boolean; data: Customer }>(
      '/customers',
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  updateCustomer(id: string, data: Record<string, unknown>) {
    return this.request<{ success: boolean; data: Customer }>(
      `/customers/${id}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
  }

  addFollowUp(customerId: string, data: { note: string; followUpDate: string }) {
    return this.request<{ success: boolean; data: FollowUp }>(
      `/customers/${customerId}/followups`,
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  getProducts(page = 1, limit = 10, search = '') {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    return this.request<{ success: boolean; data: Product[]; pagination: Pagination }>(
      `/products?${params}`
    );
  }

  getProduct(id: string) {
    return this.request<{ success: boolean; data: Product }>(`/products/${id}`);
  }

  createProduct(data: Record<string, unknown>) {
    return this.request<{ success: boolean; data: Product }>(
      '/products',
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  updateProduct(id: string, data: Record<string, unknown>) {
    return this.request<{ success: boolean; data: Product }>(
      `/products/${id}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
  }

  getProductMovements(productId: string, page = 1, limit = 20) {
    return this.request<{ success: boolean; data: StockMovement[]; pagination: Pagination }>(
      `/products/${productId}/movements?page=${page}&limit=${limit}`
    );
  }

  getAllMovements(page = 1, limit = 20) {
    return this.request<{ success: boolean; data: StockMovement[]; pagination: Pagination }>(
      `/products/movements/all?page=${page}&limit=${limit}`
    );
  }

  addStockMovement(productId: string, data: { quantityChanged: number; movementType: string; reason: string }) {
    return this.request<{ success: boolean; data: { movement: StockMovement; product: Product } }>(
      `/products/${productId}/movements`,
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  getChallans(page = 1, limit = 10, search = '') {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    return this.request<{ success: boolean; data: SalesChallan[]; pagination: Pagination }>(
      `/challans?${params}`
    );
  }

  getChallan(id: string) {
    return this.request<{ success: boolean; data: SalesChallan }>(`/challans/${id}`);
  }

  createChallan(data: Record<string, unknown>) {
    return this.request<{ success: boolean; data: SalesChallan }>(
      '/challans',
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  updateChallan(id: string, data: Record<string, unknown>) {
    return this.request<{ success: boolean; data: SalesChallan }>(
      `/challans/${id}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
  }

  confirmChallan(id: string) {
    return this.request<{ success: boolean; data: SalesChallan; message: string }>(
      `/challans/${id}/confirm`,
      { method: 'POST' }
    );
  }

  cancelChallan(id: string) {
    return this.request<{ success: boolean; data: SalesChallan; message: string }>(
      `/challans/${id}/cancel`,
      { method: 'POST' }
    );
  }
}

export const api = new ApiClient();
