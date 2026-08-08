import { Router } from 'express';
import { getProducts, getProductById, createProduct, updateProduct, adjustStock, getStockMovements } from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// View endpoints: accessible to all authenticated roles
router.get('/', getProducts);
router.get('/movements/log', getStockMovements); // audit logs channel
router.get('/:id', getProductById);

// Write/Edit product details: Admin, Sales, Warehouse
router.post('/', authorize([Role.Admin, Role.Sales, Role.Warehouse]), createProduct);
router.put('/:id', authorize([Role.Admin, Role.Sales, Role.Warehouse]), updateProduct);

// Adjust inventory stock: restricted to Admin and Warehouse keepers (critical audit safeguard)
router.post('/:id/adjust', authorize([Role.Admin, Role.Warehouse]), adjustStock);

export default router;
