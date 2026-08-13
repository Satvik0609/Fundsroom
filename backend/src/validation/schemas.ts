import { z } from 'zod';
import { UserRole, CustomerType, CustomerStatus, MovementType, ChallanStatus } from '@prisma/client';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
});

const optionalEmail = z.union([
  z.literal(''),
  z.string().email('Invalid email'),
]).optional();

const optionalGst = z.union([
  z.literal(''),
  z.string().regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    'Invalid GST number'
  ),
]).optional();

export const createCustomerSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required').max(200),
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number (10 digits starting with 6-9)'),
  email: optionalEmail,
  businessName: z.string().max(200).optional(),
  gstNumber: optionalGst,
  customerType: z.nativeEnum(CustomerType),
  address: z.string().max(500).optional(),
  status: z.nativeEnum(CustomerStatus).default(CustomerStatus.LEAD),
  followUpDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const followUpSchema = z.object({
  note: z.string().min(1, 'Note is required').max(2000),
  followUpDate: z.coerce.date(),
});

export const createProductSchema = z.object({
  productName: z.string().min(1, 'Product name is required').max(200),
  sku: z.string().min(1, 'SKU is required').max(50),
  category: z.string().min(1, 'Category is required').max(100),
  unitPrice: z.coerce.number().positive('Unit price must be positive'),
  currentStock: z.coerce.number().int().min(0, 'Stock cannot be negative').default(0),
  minimumStock: z.coerce.number().int().min(0).default(0),
  warehouseLocation: z.string().max(100).optional(),
});

export const updateProductSchema = createProductSchema.partial().omit({ sku: true });

export const stockMovementSchema = z.object({
  quantityChanged: z.coerce.number().int().positive('Quantity must be positive'),
  movementType: z.nativeEnum(MovementType),
  reason: z.string().min(1, 'Reason is required').max(500),
});

export const challanItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.coerce.number().int().positive('Quantity must be positive'),
});

export const createChallanSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  items: z.array(challanItemSchema).min(1, 'At least one item is required'),
  status: z.nativeEnum(ChallanStatus).default(ChallanStatus.DRAFT),
});

export const updateChallanSchema = z.object({
  customerId: z.string().uuid().optional(),
  items: z.array(challanItemSchema).min(1).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type FollowUpInput = z.infer<typeof followUpSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type StockMovementInput = z.infer<typeof stockMovementSchema>;
export type CreateChallanInput = z.infer<typeof createChallanSchema>;
export type UpdateChallanInput = z.infer<typeof updateChallanSchema>;
