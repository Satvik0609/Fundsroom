import { Router } from 'express';
import { UserRole } from '@prisma/client';
import * as productController from '../controllers/product.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  paginationSchema,
  createProductSchema,
  updateProductSchema,
  stockMovementSchema,
} from '../validation/schemas';

const router = Router();

const readRoles = [UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTS];
const writeProductRoles = [UserRole.ADMIN, UserRole.WAREHOUSE];
const stockRoles = [UserRole.ADMIN, UserRole.WAREHOUSE];

router.use(requireAuth);

router.get('/movements/all', requireRole(...readRoles), validateQuery(paginationSchema), productController.listAllMovements);
router.get('/', requireRole(...readRoles), validateQuery(paginationSchema), productController.list);
router.get('/:id', requireRole(...readRoles), productController.getById);
router.post('/', requireRole(...writeProductRoles), validateBody(createProductSchema), productController.create);
router.put('/:id', requireRole(...writeProductRoles), validateBody(updateProductSchema), productController.update);
router.get('/:id/movements', requireRole(...readRoles), validateQuery(paginationSchema), productController.getMovements);
router.post('/:id/movements', requireRole(...stockRoles), validateBody(stockMovementSchema), productController.addMovement);

export default router;
