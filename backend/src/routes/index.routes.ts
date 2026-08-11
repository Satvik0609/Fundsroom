import { Router } from 'express';
import { UserRole } from '@prisma/client';
import * as dashboardController from '../controllers/dashboard.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/health', dashboardController.health);
router.get('/dashboard', requireAuth, requireRole(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTS), dashboardController.getStats);

export default router;
