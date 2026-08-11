import { PrismaClient, UserRole, CustomerType, CustomerStatus, MovementType, ChallanStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'Pass@123';

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const users = [
    { name: 'Admin User', email: 'admin@erp.local', role: UserRole.ADMIN },
    { name: 'Sales User', email: 'sales@erp.local', role: UserRole.SALES },
    { name: 'Warehouse User', email: 'warehouse@erp.local', role: UserRole.WAREHOUSE },
    { name: 'Accounts User', email: 'accounts@erp.local', role: UserRole.ACCOUNTS },
  ];

  const userMap: Record<string, string> = {};

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash },
      create: { ...u, passwordHash },
    });
    userMap[u.role] = user.id;
    console.log(`  User: ${u.email}`);
  }

  const salesId = userMap[UserRole.SALES];
  const warehouseId = userMap[UserRole.WAREHOUSE];

  const customers = [
    {
      customerName: 'Rajesh Traders',
      mobileNumber: '9876543210',
      email: 'rajesh@traders.com',
      businessName: 'Rajesh Traders Pvt Ltd',
      gstNumber: '27AABCR1234F1Z5',
      customerType: CustomerType.WHOLESALE,
      address: '12 Market Road, Mumbai, MH 400001',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date('2026-08-15'),
      notes: 'Regular wholesale buyer',
    },
    {
      customerName: 'Sunrise Retail',
      mobileNumber: '9123456780',
      email: 'contact@sunrise.com',
      businessName: 'Sunrise Retail Store',
      customerType: CustomerType.RETAIL,
      address: '45 MG Road, Pune, MH 411001',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date('2026-08-20'),
    },
    {
      customerName: 'Global Distributors',
      mobileNumber: '9988776655',
      email: 'info@globaldist.com',
      businessName: 'Global Distributors Inc',
      gstNumber: '29AADCG5678H1Z2',
      customerType: CustomerType.DISTRIBUTOR,
      address: '78 Industrial Area, Bangalore, KA 560001',
      status: CustomerStatus.ACTIVE,
    },
    {
      customerName: 'New Lead Corp',
      mobileNumber: '9112233445',
      email: 'lead@newcorp.com',
      businessName: 'New Lead Corp',
      customerType: CustomerType.WHOLESALE,
      status: CustomerStatus.LEAD,
      followUpDate: new Date('2026-08-12'),
      notes: 'Potential new client from trade show',
    },
    {
      customerName: 'Inactive Shop',
      mobileNumber: '9001122334',
      businessName: 'Inactive Shop',
      customerType: CustomerType.RETAIL,
      status: CustomerStatus.INACTIVE,
    },
  ];

  const customerIds: string[] = [];
  for (const c of customers) {
    const existing = await prisma.customer.findFirst({
      where: { customerName: c.customerName, mobileNumber: c.mobileNumber },
    });
    if (existing) {
      customerIds.push(existing.id);
    } else {
      const created = await prisma.customer.create({
        data: { ...c, createdById: salesId },
      });
      customerIds.push(created.id);
    }
  }
  console.log(`  Customers: ${customerIds.length}`);

  if (customerIds[0]) {
    const existingFollowUp = await prisma.customerFollowUp.findFirst({
      where: { customerId: customerIds[0], note: 'Initial contact - interested in bulk order' },
    });
    if (!existingFollowUp) {
      await prisma.customerFollowUp.create({
        data: {
          customerId: customerIds[0],
          note: 'Initial contact - interested in bulk order',
          followUpDate: new Date('2026-08-10'),
          createdById: salesId,
        },
      });
    }
  }

  const products = [
    { productName: 'Wireless Keyboard', sku: 'KB-WL-001', category: 'Electronics', unitPrice: 1299.0, currentStock: 50, minimumStock: 10, warehouseLocation: 'A-01' },
    { productName: 'USB-C Hub', sku: 'HUB-UC-002', category: 'Electronics', unitPrice: 2499.0, currentStock: 30, minimumStock: 5, warehouseLocation: 'A-02' },
    { productName: 'Office Chair', sku: 'CHR-OF-003', category: 'Furniture', unitPrice: 8999.0, currentStock: 8, minimumStock: 10, warehouseLocation: 'B-01' },
    { productName: 'A4 Paper Ream', sku: 'PPR-A4-004', category: 'Stationery', unitPrice: 299.0, currentStock: 200, minimumStock: 50, warehouseLocation: 'C-01' },
    { productName: 'Ballpoint Pen Box', sku: 'PEN-BP-005', category: 'Stationery', unitPrice: 149.0, currentStock: 3, minimumStock: 20, warehouseLocation: 'C-02' },
    { productName: 'LED Monitor 24"', sku: 'MON-24-006', category: 'Electronics', unitPrice: 12999.0, currentStock: 15, minimumStock: 5, warehouseLocation: 'A-03' },
  ];

  const productIds: Record<string, string> = {};
  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        productName: p.productName,
        category: p.category,
        unitPrice: p.unitPrice,
        currentStock: p.currentStock,
        minimumStock: p.minimumStock,
        warehouseLocation: p.warehouseLocation,
      },
      create: p,
    });
    productIds[p.sku] = product.id;
  }
  console.log(`  Products: ${Object.keys(productIds).length}`);

  const movements = [
    { sku: 'KB-WL-001', quantityChanged: 50, movementType: MovementType.IN, reason: 'Initial stock', userId: warehouseId },
    { sku: 'HUB-UC-002', quantityChanged: 30, movementType: MovementType.IN, reason: 'Initial stock', userId: warehouseId },
    { sku: 'CHR-OF-003', quantityChanged: 8, movementType: MovementType.IN, reason: 'Initial stock', userId: warehouseId },
    { sku: 'PPR-A4-004', quantityChanged: 200, movementType: MovementType.IN, reason: 'Initial stock', userId: warehouseId },
    { sku: 'PEN-BP-005', quantityChanged: 3, movementType: MovementType.IN, reason: 'Initial stock', userId: warehouseId },
    { sku: 'MON-24-006', quantityChanged: 15, movementType: MovementType.IN, reason: 'Initial stock', userId: warehouseId },
  ];

  for (const m of movements) {
    const productId = productIds[m.sku];
    const existing = await prisma.stockMovement.findFirst({
      where: { productId, reason: m.reason, quantityChanged: m.quantityChanged },
    });
    if (!existing) {
      await prisma.stockMovement.create({
        data: {
          productId,
          quantityChanged: m.quantityChanged,
          movementType: m.movementType,
          reason: m.reason,
          createdById: m.userId,
        },
      });
    }
  }
  console.log('  Stock movements seeded');

  const year = new Date().getFullYear();
  await prisma.challanSequence.upsert({
    where: { year },
    update: {},
    create: { year, lastNo: 0 },
  });

  const existingDraft = await prisma.salesChallan.findFirst({
    where: { challanNumber: `SC-${year}-000001` },
  });

  if (!existingDraft && customerIds[0] && productIds['KB-WL-001']) {
    const kbProduct = await prisma.product.findUnique({ where: { sku: 'KB-WL-001' } });
    if (kbProduct) {
      await prisma.$transaction(async (tx) => {
        await tx.challanSequence.update({
          where: { year },
          data: { lastNo: 1 },
        });

        await tx.salesChallan.create({
          data: {
            challanNumber: `SC-${year}-000001`,
            customerId: customerIds[0],
            totalQuantity: 5,
            status: ChallanStatus.DRAFT,
            createdById: salesId,
            items: {
              create: [{
                productId: kbProduct.id,
                productNameSnapshot: kbProduct.productName,
                skuSnapshot: kbProduct.sku,
                unitPriceSnapshot: kbProduct.unitPrice,
                quantity: 5,
                lineTotal: Number(kbProduct.unitPrice) * 5,
              }],
            },
          },
        });
      });
      console.log('  Draft challan seeded');
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
