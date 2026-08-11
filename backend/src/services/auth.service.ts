import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { AppError } from '../utils/AppError';
import { signToken } from '../middleware/auth';
import { omitPassword } from '../utils/helpers';
import { LoginInput } from '../validation/schemas';

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });

  return {
    token,
    user: omitPassword(user),
  };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('User not found', 404);
  return omitPassword(user);
}
