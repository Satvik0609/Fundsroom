import { Router } from 'express';
import { UserRole } from '@prisma/client';
import * as customerController from '../controllers/customer.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  paginationSchema,
  createCustomerSchema,
  updateCustomerSchema,
  followUpSchema,
} from '../validation/schemas';

const router = Router();

const readRoles = [UserRole.ADMIN, UserRole.SALES, UserRole.ACCOUNTS];
const writeRoles = [UserRole.ADMIN, UserRole.SALES];

router.use(requireAuth);

router.get('/', requireRole(...readRoles), validateQuery(paginationSchema), customerController.list);
router.get('/:id', requireRole(...readRoles), customerController.getById);
router.post('/', requireRole(...writeRoles), validateBody(createCustomerSchema), customerController.create);
router.put('/:id', requireRole(...writeRoles), validateBody(updateCustomerSchema), customerController.update);
router.post('/:id/followups', requireRole(...writeRoles), validateBody(followUpSchema), customerController.addFollowUp);

export default router;
