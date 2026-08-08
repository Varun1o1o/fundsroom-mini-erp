import { Router } from 'express';
import { getChallans, getChallanById, createChallan, updateChallan, confirmChallan, cancelChallan } from '../controllers/challan.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// View endpoints: accessible to all authenticated roles
router.get('/', getChallans);
router.get('/:id', getChallanById);

// Billing creation / modification: limited to Admin and Sales
router.post('/', authorize([Role.Admin, Role.Sales]), createChallan);
router.put('/:id', authorize([Role.Admin, Role.Sales]), updateChallan);

// Dispatch/Confirmation: Admin, Sales, Warehouse keepers
router.post('/:id/confirm', authorize([Role.Admin, Role.Sales, Role.Warehouse]), confirmChallan);

// Cancellation and Stock Restoration: restricted to Admin and Sales (Financial control)
router.post('/:id/cancel', authorize([Role.Admin, Role.Sales]), cancelChallan);

export default router;
