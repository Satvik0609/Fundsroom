import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { AppError } from '../utils/AppError';
import { paginate } from '../utils/helpers';
import { CreateCustomerInput, UpdateCustomerInput, FollowUpInput, PaginationInput } from '../validation/schemas';

function buildSearchFilter(search?: string): Prisma.CustomerWhereInput {
  if (!search) return {};
  return {
    OR: [
      { customerName: { contains: search, mode: 'insensitive' } },
      { businessName: { contains: search, mode: 'insensitive' } },
      { mobileNumber: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ],
  };
}

export async function listCustomers(query: PaginationInput) {
  const { page, limit, search } = query;
  const where = buildSearchFilter(search);
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { followUps: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return { data, pagination: paginate(page, limit, total) };
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      followUps: {
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true } } },
      },
    },
  });
  if (!customer) throw new AppError('Customer not found', 404);
  return customer;
}

export async function createCustomer(input: CreateCustomerInput, userId: string) {
  const data = {
    ...input,
    email: input.email || null,
    gstNumber: input.gstNumber || null,
    createdById: userId,
  };

  return prisma.customer.create({
    data,
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  await getCustomerById(id);

  const data: Prisma.CustomerUpdateInput = {
    ...input,
    email: input.email === '' ? null : input.email,
    gstNumber: input.gstNumber === '' ? null : input.gstNumber,
  };

  return prisma.customer.update({
    where: { id },
    data,
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

export async function addFollowUp(customerId: string, input: FollowUpInput, userId: string) {
  await getCustomerById(customerId);

  const [followUp] = await prisma.$transaction([
    prisma.customerFollowUp.create({
      data: {
        customerId,
        note: input.note,
        followUpDate: input.followUpDate,
        createdById: userId,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data: { followUpDate: input.followUpDate },
    }),
  ]);

  return followUp;
}
