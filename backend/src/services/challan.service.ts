import { ChallanStatus, MovementType, Prisma } from '@prisma/client';
import { prisma } from '../db';
import { AppError } from '../utils/AppError';
import { paginate } from '../utils/helpers';
import { CreateChallanInput, UpdateChallanInput, PaginationInput } from '../validation/schemas';

async function generateChallanNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();

  const sequence = await tx.challanSequence.upsert({
    where: { year },
    update: { lastNo: { increment: 1 } },
    create: { year, lastNo: 1 },
  });

  const padded = String(sequence.lastNo).padStart(6, '0');
  return `SC-${year}-${padded}`;
}

async function buildChallanItems(items: { productId: string; quantity: number }[]) {
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  if (products.length !== productIds.length) {
    throw new AppError('One or more products not found', 404);
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  return items.map((item) => {
    const product = productMap.get(item.productId)!;
    const unitPrice = Number(product.unitPrice);
    return {
      productId: product.id,
      productNameSnapshot: product.productName,
      skuSnapshot: product.sku,
      unitPriceSnapshot: product.unitPrice,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
    };
  });
}

function calcTotalQuantity(items: { quantity: number }[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export async function listChallans(query: PaginationInput & { status?: ChallanStatus }) {
  const { page, limit, search, status } = query as PaginationInput & { status?: ChallanStatus };
  const skip = (page - 1) * limit;

  const where: Prisma.SalesChallanWhereInput = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { challanNumber: { contains: search, mode: 'insensitive' } },
      { customer: { customerName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.salesChallan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, customerName: true, businessName: true } },
        createdBy: { select: { id: true, name: true } },
        items: true,
      },
    }),
    prisma.salesChallan.count({ where }),
  ]);

  const enriched = data.map((c) => ({
    ...c,
    totalValue: c.items.reduce((sum, i) => sum + Number(i.lineTotal), 0),
  }));

  return { data: enriched, pagination: paginate(page, limit, total) };
}

export async function getChallanById(id: string) {
  const challan = await prisma.salesChallan.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true, email: true } },
      items: { include: { product: { select: { id: true, sku: true, currentStock: true } } } },
    },
  });
  if (!challan) throw new AppError('Challan not found', 404);

  return {
    ...challan,
    totalValue: challan.items.reduce((sum, i) => sum + Number(i.lineTotal), 0),
  };
}

export async function createChallan(input: CreateChallanInput, userId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new AppError('Customer not found', 404);

  const builtItems = await buildChallanItems(input.items);
  const totalQuantity = calcTotalQuantity(builtItems);

  if (input.status === ChallanStatus.CONFIRMED) {
    return createAndConfirmChallan(input.customerId, builtItems, totalQuantity, userId);
  }

  return prisma.$transaction(async (tx) => {
    const challanNumber = await generateChallanNumber(tx);

    return tx.salesChallan.create({
      data: {
        challanNumber,
        customerId: input.customerId,
        totalQuantity,
        status: ChallanStatus.DRAFT,
        createdById: userId,
        items: { create: builtItems },
      },
      include: {
        customer: { select: { id: true, customerName: true } },
        createdBy: { select: { id: true, name: true } },
        items: true,
      },
    });
  });
}

async function createAndConfirmChallan(
  customerId: string,
  builtItems: Awaited<ReturnType<typeof buildChallanItems>>,
  totalQuantity: number,
  userId: string
) {
  return prisma.$transaction(async (tx) => {
    const challanNumber = await generateChallanNumber(tx);

    const challan = await tx.salesChallan.create({
      data: {
        challanNumber,
        customerId,
        totalQuantity,
        status: ChallanStatus.DRAFT,
        createdById: userId,
        items: { create: builtItems },
      },
      include: { items: true },
    });

    await confirmChallanInTransaction(tx, challan.id, userId);

    return tx.salesChallan.findUnique({
      where: { id: challan.id },
      include: {
        customer: { select: { id: true, customerName: true } },
        createdBy: { select: { id: true, name: true } },
        items: true,
      },
    });
  });
}

export async function updateChallan(id: string, input: UpdateChallanInput) {
  const challan = await getChallanById(id);

  if (challan.status !== ChallanStatus.DRAFT) {
    throw new AppError('Only draft challans can be edited', 409);
  }

  if (input.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new AppError('Customer not found', 404);
  }

  return prisma.$transaction(async (tx) => {
    if (input.items) {
      await tx.salesChallanItem.deleteMany({ where: { challanId: id } });
      const builtItems = await buildChallanItems(input.items);
      const totalQuantity = calcTotalQuantity(builtItems);

      await tx.salesChallanItem.createMany({
        data: builtItems.map((item) => ({ ...item, challanId: id })),
      });

      return tx.salesChallan.update({
        where: { id },
        data: {
          customerId: input.customerId,
          totalQuantity,
        },
        include: {
          customer: { select: { id: true, customerName: true } },
          createdBy: { select: { id: true, name: true } },
          items: true,
        },
      });
    }

    return tx.salesChallan.update({
      where: { id },
      data: { customerId: input.customerId },
      include: {
        customer: { select: { id: true, customerName: true } },
        createdBy: { select: { id: true, name: true } },
        items: true,
      },
    });
  });
}

async function confirmChallanInTransaction(
  tx: Prisma.TransactionClient,
  challanId: string,
  userId: string
) {
  const challan = await tx.salesChallan.findUnique({
    where: { id: challanId },
    include: { items: true },
  });

  if (!challan) throw new AppError('Challan not found', 404);
  if (challan.status !== ChallanStatus.DRAFT) {
    throw new AppError(`Cannot confirm challan with status ${challan.status}`, 409);
  }

  for (const item of challan.items) {
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product) {
      throw new AppError(`Product not found for item ${item.skuSnapshot}`, 404);
    }
    if (product.currentStock < item.quantity) {
      throw new AppError(`Insufficient stock for product ${product.productName}`, 409, {
        productId: product.id,
        productName: product.productName,
        sku: product.sku,
        available: product.currentStock,
        requested: item.quantity,
      });
    }
  }

  for (const item of challan.items) {
    await tx.product.update({
      where: { id: item.productId },
      data: { currentStock: { decrement: item.quantity } },
    });

    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        quantityChanged: item.quantity,
        movementType: MovementType.OUT,
        reason: `Challan ${challan.challanNumber} confirmed`,
        createdById: userId,
      },
    });
  }

  await tx.salesChallan.update({
    where: { id: challanId },
    data: { status: ChallanStatus.CONFIRMED },
  });
}

export async function confirmChallan(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    await confirmChallanInTransaction(tx, id, userId);

    const challan = await tx.salesChallan.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, customerName: true } },
        createdBy: { select: { id: true, name: true } },
        items: true,
      },
    });

    return {
      ...challan!,
      totalValue: challan!.items.reduce((sum, i) => sum + Number(i.lineTotal), 0),
    };
  });
}

export async function cancelChallan(id: string) {
  const challan = await getChallanById(id);

  if (challan.status === ChallanStatus.CANCELLED) {
    throw new AppError('Challan is already cancelled', 409);
  }

  if (challan.status === ChallanStatus.CONFIRMED) {
    throw new AppError(
      'Confirmed challans cannot be cancelled. Stock has already been deducted.',
      409
    );
  }

  return prisma.salesChallan.update({
    where: { id },
    data: { status: ChallanStatus.CANCELLED },
    include: {
      customer: { select: { id: true, customerName: true } },
      createdBy: { select: { id: true, name: true } },
      items: true,
    },
  });
}
