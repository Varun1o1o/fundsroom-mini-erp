import { Router } from 'express';
import { getCustomers, getCustomerById, createCustomer, updateCustomer, createFollowUp } from '../controllers/customer.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// Apply auth middleware to all customer endpoints
router.use(authenticate);

// View endpoints: accessible to all ERP users
router.get('/', getCustomers);
router.get('/:id', getCustomerById);

// Write/Edit endpoints: restricted to Admin and Sales roles
router.post('/', authorize([Role.Admin, Role.Sales]), createCustomer);
router.put('/:id', authorize([Role.Admin, Role.Sales]), updateCustomer);
router.post('/:id/followups', authorize([Role.Admin, Role.Sales]), createFollowUp);

export default router;
