import request from 'supertest';
import app from '../src/server';
import { prisma } from '../src/db';
import { UserRole, MovementType, ChallanStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const API = request(app);

let adminToken: string;
let salesToken: string;
let warehouseToken: string;
let accountsToken: string;

beforeAll(async () => {
  const passwordHash = await bcrypt.hash('Pass@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'test-admin@erp.local' },
    update: {},
    create: { name: 'Test Admin', email: 'test-admin@erp.local', passwordHash, role: UserRole.ADMIN },
  });

  const sales = await prisma.user.upsert({
    where: { email: 'test-sales@erp.local' },
    update: {},
    create: { name: 'Test Sales', email: 'test-sales@erp.local', passwordHash, role: UserRole.SALES },
  });

  const warehouse = await prisma.user.upsert({
    where: { email: 'test-warehouse@erp.local' },
    update: {},
    create: { name: 'Test Warehouse', email: 'test-warehouse@erp.local', passwordHash, role: UserRole.WAREHOUSE },
  });

  const accounts = await prisma.user.upsert({
    where: { email: 'test-accounts@erp.local' },
    update: {},
    create: { name: 'Test Accounts', email: 'test-accounts@erp.local', passwordHash, role: UserRole.ACCOUNTS },
  });

  adminToken = (await API.post('/auth/login').send({ email: admin.email, password: 'Pass@123' })).body.data.token;
  salesToken = (await API.post('/auth/login').send({ email: sales.email, password: 'Pass@123' })).body.data.token;
  warehouseToken = (await API.post('/auth/login').send({ email: warehouse.email, password: 'Pass@123' })).body.data.token;
  accountsToken = (await API.post('/auth/login').send({ email: accounts.email, password: 'Pass@123' })).body.data.token;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Authentication', () => {
  it('should login with valid credentials', async () => {
    const res = await API.post('/auth/login').send({ email: 'test-admin@erp.local', password: 'Pass@123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('ADMIN');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('should reject invalid login', async () => {
    const res = await API.post('/auth/login').send({ email: 'test-admin@erp.local', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('should reject protected endpoint without token', async () => {
    const res = await API.get('/customers');
    expect(res.status).toBe(401);
  });

  it('should reject forbidden role for customer create', async () => {
    const res = await API.post('/customers')
      .set('Authorization', `Bearer ${accountsToken}`)
      .send({
        customerName: 'Forbidden Test',
        mobileNumber: '9876543211',
        customerType: 'RETAIL',
      });
    expect(res.status).toBe(403);
  });
});

describe('Customers', () => {
  let customerId: string;

  it('should create a customer', async () => {
    const res = await API.post('/customers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerName: 'Test Customer API',
        mobileNumber: '9876543212',
        email: 'testcustomer@example.com',
        customerType: 'WHOLESALE',
        status: 'LEAD',
      });
    expect(res.status).toBe(201);
    customerId = res.body.data.id;
  });

  it('should search customers', async () => {
    const res = await API.get('/customers?search=Test Customer API')
      .set('Authorization', `Bearer ${salesToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should update a customer', async () => {
    const res = await API.put(`/customers/${customerId}`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACTIVE' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('should reject invalid customer data', async () => {
    const res = await API.post('/customers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ customerName: '', mobileNumber: '123', customerType: 'RETAIL' });
    expect(res.status).toBe(400);
  });
});

describe('Products & Stock', () => {
  let productId: string;

  it('should create a product', async () => {
    const res = await API.post('/products')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        productName: 'Test Product',
        sku: `TEST-${Date.now()}`,
        category: 'Test',
        unitPrice: 100,
        currentStock: 5,
        minimumStock: 2,
      });
    expect(res.status).toBe(201);
    productId = res.body.data.id;
    expect(res.body.data.currentStock).toBe(5);
  });

  it('should record stock IN', async () => {
    const res = await API.post(`/products/${productId}/movements`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ quantityChanged: 10, movementType: 'IN', reason: 'Restock' });
    expect(res.status).toBe(201);
    expect(res.body.data.product.currentStock).toBe(15);
  });

  it('should record stock OUT', async () => {
    const res = await API.post(`/products/${productId}/movements`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ quantityChanged: 5, movementType: 'OUT', reason: 'Sample out' });
    expect(res.status).toBe(201);
    expect(res.body.data.product.currentStock).toBe(10);
  });

  it('should reject insufficient stock OUT', async () => {
    const res = await API.post(`/products/${productId}/movements`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ quantityChanged: 100, movementType: 'OUT', reason: 'Too much' });
    expect(res.status).toBe(409);
  });
});

describe('Challan Critical Business Logic', () => {
  let productId: string;
  let customerId: string;
  let challanId: string;
  const sku = `TEST-001-${Date.now()}`;

  beforeAll(async () => {
    const product = await prisma.product.create({
      data: {
        productName: 'Test Product',
        sku,
        category: 'Test',
        unitPrice: 100,
        currentStock: 5,
        minimumStock: 1,
      },
    });
    productId = product.id;

    const customer = await prisma.customer.create({
      data: {
        customerName: 'Test Customer',
        mobileNumber: '9123456789',
        customerType: 'RETAIL',
        createdById: (await prisma.user.findFirst({ where: { role: UserRole.SALES } }))!.id,
      },
    });
    customerId = customer.id;
  });

  it('should create draft challan without reducing stock', async () => {
    const res = await API.post('/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId,
        items: [{ productId, quantity: 10 }],
        status: 'DRAFT',
      });
    expect(res.status).toBe(201);
    challanId = res.body.data.id;
    expect(res.body.data.status).toBe('DRAFT');

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product!.currentStock).toBe(5);
  });

  it('should reject confirm with insufficient stock (409)', async () => {
    const res = await API.post(`/challans/${challanId}/confirm`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Insufficient stock');

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product!.currentStock).toBe(5);

    const challan = await prisma.salesChallan.findUnique({ where: { id: challanId } });
    expect(challan!.status).toBe(ChallanStatus.DRAFT);

    const movements = await prisma.stockMovement.findMany({
      where: { productId, movementType: MovementType.OUT, reason: { contains: challan!.challanNumber } },
    });
    expect(movements.length).toBe(0);
  });

  it('should confirm challan with sufficient stock', async () => {
    const res2 = await API.post('/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId,
        items: [{ productId, quantity: 3 }],
        status: 'DRAFT',
      });
    expect(res2.status).toBe(201);
    const newChallanId = res2.body.data.id;

    const confirmRes = await API.post(`/challans/${newChallanId}/confirm`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe('CONFIRMED');

    const product = await prisma.product.findUnique({ where: { id: productId } });
    expect(product!.currentStock).toBe(2);

    const movements = await prisma.stockMovement.findMany({
      where: { productId, movementType: MovementType.OUT },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(movements[0].quantityChanged).toBe(3);
  });

  it('should reject invalid state transition', async () => {
    const challans = await prisma.salesChallan.findMany({ where: { status: ChallanStatus.CONFIRMED }, take: 1 });
    if (challans.length > 0) {
      const res = await API.post(`/challans/${challans[0].id}/confirm`)
        .set('Authorization', `Bearer ${salesToken}`);
      expect(res.status).toBe(409);
    }
  });
});

describe('Dashboard & Health', () => {
  it('should return health check', async () => {
    const res = await API.get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('should return dashboard stats', async () => {
    const res = await API.get('/dashboard').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalCustomers).toBeDefined();
    expect(res.body.data.totalProducts).toBeDefined();
  });
});
