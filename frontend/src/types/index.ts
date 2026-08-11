export type UserRole = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';
export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';
export type MovementType = 'IN' | 'OUT';
export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Customer {
  id: string;
  customerName: string;
  mobileNumber: string;
  email?: string | null;
  businessName?: string | null;
  gstNumber?: string | null;
  customerType: CustomerType;
  address?: string | null;
  status: CustomerStatus;
  followUpDate?: string | null;
  notes?: string | null;
  createdBy?: { id: string; name: string };
  followUps?: FollowUp[];
  _count?: { followUps: number };
}

export interface FollowUp {
  id: string;
  note: string;
  followUpDate: string;
  createdAt: string;
  createdBy?: { id: string; name: string };
}

export interface Product {
  id: string;
  productName: string;
  sku: string;
  category: string;
  unitPrice: number | string;
  currentStock: number;
  minimumStock: number;
  warehouseLocation?: string | null;
  isLowStock?: boolean;
}

export interface StockMovement {
  id: string;
  quantityChanged: number;
  movementType: MovementType;
  reason: string;
  createdAt: string;
  product?: { id: string; productName: string; sku: string };
  createdBy?: { id: string; name: string };
}

export interface ChallanItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPriceSnapshot: number | string;
  quantity: number;
  lineTotal: number | string;
  product?: { id: string; sku: string; currentStock: number };
}

export interface SalesChallan {
  id: string;
  challanNumber: string;
  customerId: string;
  totalQuantity: number;
  totalValue?: number;
  status: ChallanStatus;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; customerName: string; businessName?: string };
  createdBy?: { id: string; name: string };
  items?: ChallanItem[];
}

export interface DashboardStats {
  totalCustomers: number;
  activeCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
  totalStockQuantity: number;
  draftChallans: number;
  confirmedChallans: number;
  recentChallans: SalesChallan[];
  recentMovements: StockMovement[];
}

export interface ApiError {
  success: false;
  message: string;
  details?: Record<string, unknown>;
}
