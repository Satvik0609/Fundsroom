import { Prisma, MovementType } from '@prisma/client';
import { prisma } from '../db';
import { AppError } from '../utils/AppError';
import { paginate, isLowStock } from '../utils/helpers';
import { CreateProductInput, UpdateProductInput, StockMovementInput, PaginationInput } from '../validation/schemas';

function buildSearchFilter(search?: string): Prisma.ProductWhereInput {
  if (!search) return {};
  return {
    OR: [
      { productName: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ],
  };
}

function enrichProduct<T extends { currentStock: number; minimumStock: number }>(product: T) {
  return {
    ...product,
    isLowStock: isLowStock(product.currentStock, product.minimumStock),
  };
}

export async function listProducts(query: PaginationInput) {
  const { page, limit, search } = query;
  const where = buildSearchFilter(search);
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, skip, take: limit, orderBy: { productName: 'asc' } }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products.map(enrichProduct),
    pagination: paginate(page, limit, total),
  };
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError('Product not found', 404);
  return enrichProduct(product);
}

export async function createProduct(input: CreateProductInput) {
  const existing = await prisma.product.findUnique({ where: { sku: input.sku } });
  if (existing) throw new AppError('Product with this SKU already exists', 409);

  const product = await prisma.product.create({ data: input });
  return enrichProduct(product);
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  await getProductById(id);

  if (input.currentStock !== undefined && input.currentStock < 0) {
    throw new AppError('Stock cannot be negative', 400);
  }

  const product = await prisma.product.update({ where: { id }, data: input });
  return enrichProduct(product);
}

export async function getStockMovements(productId: string, query: PaginationInput) {
  await getProductById(productId);
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const where = { productId };
  const [data, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, productName: true, sku: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { data, pagination: paginate(page, limit, total) };
}

export async function listAllStockMovements(query: PaginationInput) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.stockMovement.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, productName: true, sku: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.stockMovement.count(),
  ]);

  return { data, pagination: paginate(page, limit, total) };
}

export async function recordStockMovement(
  productId: string,
  input: StockMovementInput,
  userId: string
) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw new AppError('Product not found', 404);

    let newStock = product.currentStock;
    if (input.movementType === MovementType.IN) {
      newStock += input.quantityChanged;
    } else {
      newStock -= input.quantityChanged;
      if (newStock < 0) {
        throw new AppError('Insufficient stock for OUT movement', 409, {
          available: product.currentStock,
          requested: input.quantityChanged,
        });
      }
    }

    const [movement, updatedProduct] = await Promise.all([
      tx.stockMovement.create({
        data: {
          productId,
          quantityChanged: input.quantityChanged,
          movementType: input.movementType,
          reason: input.reason,
          createdById: userId,
        },
        include: {
          product: { select: { id: true, productName: true, sku: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
      tx.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      }),
    ]);

    return { movement, product: enrichProduct(updatedProduct) };
  });
}
