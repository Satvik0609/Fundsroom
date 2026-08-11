import { CustomerStatus, ChallanStatus } from '@prisma/client';
import { prisma } from '../db';
import { isLowStock } from '../utils/helpers';

export async function getDashboardStats() {
  const [
    totalCustomers,
    activeCustomers,
    totalProducts,
    products,
    draftChallans,
    confirmedChallans,
    recentChallans,
    recentMovements,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where: { status: CustomerStatus.ACTIVE } }),
    prisma.product.count(),
    prisma.product.findMany({ select: { currentStock: true, minimumStock: true } }),
    prisma.salesChallan.count({ where: { status: ChallanStatus.DRAFT } }),
    prisma.salesChallan.count({ where: { status: ChallanStatus.CONFIRMED } }),
    prisma.salesChallan.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { customerName: true } },
        createdBy: { select: { name: true } },
        items: true,
      },
    }),
    prisma.stockMovement.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { productName: true, sku: true } },
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  const lowStockProducts = products.filter((p) => isLowStock(p.currentStock, p.minimumStock)).length;
  const totalStockQuantity = products.reduce((sum, p) => sum + p.currentStock, 0);

  const enrichedChallans = recentChallans.map((c) => ({
    ...c,
    totalValue: c.items.reduce((sum, i) => sum + Number(i.lineTotal), 0),
  }));

  return {
    totalCustomers,
    activeCustomers,
    totalProducts,
    lowStockProducts,
    totalStockQuantity,
    draftChallans,
    confirmedChallans,
    recentChallans: enrichedChallans,
    recentMovements,
  };
}
