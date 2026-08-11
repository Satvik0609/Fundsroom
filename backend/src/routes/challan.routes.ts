import { Router } from 'express';
import { UserRole } from '@prisma/client';
import * as challanController from '../controllers/challan.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  paginationSchema,
  createChallanSchema,
  updateChallanSchema,
} from '../validation/schemas';

const router = Router();

const readRoles = [UserRole.ADMIN, UserRole.SALES, UserRole.ACCOUNTS];
const writeRoles = [UserRole.ADMIN, UserRole.SALES];

router.use(requireAuth);

router.get('/', requireRole(...readRoles), validateQuery(paginationSchema), challanController.list);
router.get('/:id', requireRole(...readRoles), challanController.getById);
router.post('/', requireRole(...writeRoles), validateBody(createChallanSchema), challanController.create);
router.put('/:id', requireRole(...writeRoles), validateBody(updateChallanSchema), challanController.update);
router.post('/:id/confirm', requireRole(...writeRoles), challanController.confirm);
router.post('/:id/cancel', requireRole(...writeRoles), challanController.cancel);

export default router;
