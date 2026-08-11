import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate';
import { loginSchema } from '../validation/schemas';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', validateBody(loginSchema), authController.login);
router.get('/me', requireAuth, authController.me);

export default router;
