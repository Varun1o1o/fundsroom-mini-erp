import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../prisma';
import { z } from 'zod';
import { MovementType } from '@prisma/client';

// Product Validators
const productCreateSchema = z.object({
  productName: z.string().min(2, 'Name must be at least 2 characters'),
  sku: z.string().toUpperCase().min(3, 'SKU must be at least 3 characters'),
  category: z.string().min(2, 'Category must be at least 2 characters'),
  unitPrice: z.number().nonnegative('Unit Price must be a non-negative number'),
  currentStock: z.number().int().nonnegative('Current Stock must be a non-negative integer').default(0),
  minimumStockAlertQuantity: z.number().int().nonnegative('Min Stock Alert must be a non-negative integer').default(0),
  warehouseLocation: z.string().min(2, 'Location is required'),
});

const stockAdjustSchema = z.object({
  quantityChanged: z.number().int().positive('Quantity changed must be a positive integer'),
  movementType: z.nativeEnum(MovementType),
  reason: z.string().min(4, 'Reason must be at least 4 characters'),
});

// List Products
export async function getProducts(req: AuthenticatedRequest, res: Response) {
  try {
    const { category, search, lowStock } = req.query;
    let page = parseInt(req.query.page as string || '1', 10);
    let limit = parseInt(req.query.limit as string || '10', 10);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (category) {
      where.category = category as string;
    }
    if (search) {
      where.OR = [
        { productName: { contains: search as string } },
        { sku: { contains: search as string } },
      ];
    }

    let products = await prisma.product.findMany({
      where,
      orderBy: { productName: 'asc' },
    });

    if (lowStock === 'true') {
      // Filter for low stock alert
      products = products.filter(p => p.currentStock <= p.minimumStockAlertQuantity);
    }

    const count = products.length;
    const paginatedProducts = products.slice(skip, skip + limit);

    return res.status(200).json({
      products: paginatedProducts,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error: any) {
    console.error('getProducts error:', error);
    return res.status(500).json({ message: 'Internal server error listing products' });
  }
}

// Get Single Product
export async function getProductById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { name: true, role: true },
            },
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json({ product });
  } catch (error: any) {
    console.error('getProductById error:', error);
    return res.status(500).json({ message: 'Internal server error retrieving product' });
  }
}

// Create Product
export async function createProduct(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const parseResult = productCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const data = parseResult.data;

    // Check unique SKU
    const existing = await prisma.product.findUnique({
      where: { sku: data.sku },
    });
    if (existing) {
      return res.status(409).json({ message: `SKU '${data.sku}' already exists` });
    }

    // Since Prisma Decimal requires Decimal object or string/number, we pass price directly
    const product = await prisma.product.create({
      data: {
        productName: data.productName,
        sku: data.sku,
        category: data.category,
        unitPrice: data.unitPrice,
        currentStock: data.currentStock,
        minimumStockAlertQuantity: data.minimumStockAlertQuantity,
        warehouseLocation: data.warehouseLocation,
      },
    });

    // Create Initial Stock movement record
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        quantityChanged: product.currentStock,
        movementType: MovementType.IN,
        reason: 'Initial Product Registration Inventory',
        createdBy: req.user.id,
      },
    });

    return res.status(201).json({
      message: 'Product created successfully',
      product,
    });
  } catch (error: any) {
    console.error('createProduct error:', error);
    return res.status(500).json({ message: 'Internal server error registering product' });
  }
}

// Update Product Details
export async function updateProduct(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const productUpdateSchema = productCreateSchema.partial();
    const parseResult = productUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const { sku } = parseResult.data;
    if (sku && sku !== product.sku) {
      // Check SKU uniqueness
      const exists = await prisma.product.findUnique({
        where: { sku },
      });
      if (exists) {
        return res.status(409).json({ message: `SKU '${sku}' already exists` });
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...parseResult.data,
      },
    });

    return res.status(200).json({
      message: 'Product details updated',
      product: updated,
    });
  } catch (error: any) {
    console.error('updateProduct error:', error);
    return res.status(500).json({ message: 'Internal server error updating product' });
  }
}

// Adjust Stock (Warehouse & Admin only)
export async function adjustStock(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const product = await prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const parseResult = stockAdjustSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const { quantityChanged, movementType, reason } = parseResult.data;

    let nextStock = product.currentStock;
    if (movementType === MovementType.IN) {
      nextStock += quantityChanged;
    } else {
      nextStock -= quantityChanged;
      if (nextStock < 0) {
        return res.status(400).json({
          message: `Insufficient stock. Current stock is ${product.currentStock}, cannot deduct ${quantityChanged}`,
        });
      }
    }

    // Atomic transaction for movement & stock update
    const [updatedProduct, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: { currentStock: nextStock },
      }),
      prisma.stockMovement.create({
        data: {
          productId: id,
          quantityChanged,
          movementType,
          reason,
          createdBy: req.user.id,
        },
        include: {
          user: { select: { name: true, role: true } },
        },
      }),
    ]);

    return res.status(200).json({
      message: 'Stock adjusted successfully',
      currentStock: updatedProduct.currentStock,
      movement,
    });
  } catch (error: any) {
    console.error('adjustStock error:', error);
    return res.status(500).json({ message: 'Internal server error adjusting stock' });
  }
}

// Audit Log of Stock Movements
export async function getStockMovements(req: AuthenticatedRequest, res: Response) {
  try {
    let page = parseInt(req.query.page as string || '1', 10);
    let limit = parseInt(req.query.limit as string || '20', 10);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;

    const skip = (page - 1) * limit;

    const count = await prisma.stockMovement.count();
    const movements = await prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { productName: true, sku: true } },
        user: { select: { name: true, role: true } },
      },
      skip,
      take: limit,
    });

    return res.status(200).json({
      movements,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error: any) {
    console.error('getStockMovements error:', error);
    return res.status(500).json({ message: 'Internal server error retrieving stock logs' });
  }
}
