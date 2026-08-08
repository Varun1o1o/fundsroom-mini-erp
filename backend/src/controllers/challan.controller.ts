import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../prisma';
import { z } from 'zod';
import { ChallanStatus, MovementType } from '@prisma/client';

// Challan input validation schemas
const challanItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
});

const challanCreateSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(challanItemSchema).min(1, 'Challan must contain at least one item'),
  status: z.nativeEnum(ChallanStatus).optional().default(ChallanStatus.Draft),
});

// List Challans
export async function getChallans(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, customerId } = req.query;
    let page = parseInt(req.query.page as string || '1', 10);
    let limit = parseInt(req.query.limit as string || '10', 10);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status as ChallanStatus;
    }
    if (customerId) {
      where.customerId = customerId as string;
    }

    const count = await prisma.salesChallan.count({ where });
    const challans = await prisma.salesChallan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { customerName: true, businessName: true },
        },
        user: {
          select: { name: true, role: true },
        },
      },
    });

    return res.status(200).json({
      challans,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error: any) {
    console.error('getChallans error:', error);
    return res.status(500).json({ message: 'Internal server error listing challans' });
  }
}

// Get Single Challan
export async function getChallanById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: {
        customer: true,
        user: { select: { name: true, email: true, role: true } },
        items: true,
      },
    });

    if (!challan) {
      return res.status(404).json({ message: 'Sales Challan not found' });
    }

    return res.status(200).json({ challan });
  } catch (error: any) {
    console.error('getChallanById error:', error);
    return res.status(500).json({ message: 'Internal server error retrieving challan' });
  }
}

// Create Challan (Starts as Draft or Confirmed)
export async function createChallan(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const parseResult = challanCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const { customerId, items, status } = parseResult.data;

    // Check customer existence
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Verify all products exist and capture price snapshots
    const itemsWithSnapshots: any[] = [];
    let calculatedTotalQty = 0;
    let calculatedTotalAmount = 0;

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return res.status(404).json({ message: `Product with ID ${item.productId} not found` });
      }

      // Check stock if attempting to create as Confirmed immediately
      if (status === ChallanStatus.Confirmed && product.currentStock < item.quantity) {
        return res.status(409).json({
          message: `Insufficient stock for product '${product.productName}'. Available: ${product.currentStock}, requested: ${item.quantity}`,
        });
      }

      const unitPrice = Number(product.unitPrice);
      const subtotal = unitPrice * item.quantity;
      calculatedTotalQty += item.quantity;
      calculatedTotalAmount += subtotal;

      itemsWithSnapshots.push({
        productId: product.id,
        productNameSnapshot: product.productName,
        skuSnapshot: product.sku,
        unitPriceSnapshot: product.unitPrice,
        quantity: item.quantity,
        subtotal: subtotal,
      });
    }

    // Generate unique sequential Challan Number
    const year = new Date().getFullYear();
    const latest = await prisma.salesChallan.findFirst({
      where: { challanNumber: { startsWith: `CH-${year}-` } },
      orderBy: { challanNumber: 'desc' },
    });

    let nextSuffix = 1;
    if (latest) {
      const parts = latest.challanNumber.split('-');
      const lastNum = parseInt(parts[2], 10);
      if (!isNaN(lastNum)) {
        nextSuffix = lastNum + 1;
      }
    }
    const challanNumber = `CH-${year}-${String(nextSuffix).padStart(4, '0')}`;

    // Perform database operations
    const savedChallan = await prisma.$transaction(async (tx) => {
      // 1. Create SalesChallan main record
      const challan = await tx.salesChallan.create({
        data: {
          challanNumber,
          customerId,
          totalQuantity: calculatedTotalQty,
          totalAmount: calculatedTotalAmount,
          status,
          createdBy: req.user!.id,
        },
      });

      // 2. Create items related
      for (const snapshot of itemsWithSnapshots) {
        await tx.salesChallanItem.create({
          data: {
            challanId: challan.id,
            productId: snapshot.productId,
            productNameSnapshot: snapshot.productNameSnapshot,
            skuSnapshot: snapshot.skuSnapshot,
            unitPriceSnapshot: snapshot.unitPriceSnapshot,
            quantity: snapshot.quantity,
            subtotal: snapshot.subtotal,
          },
        });

        // 3. Deduct stock & create movement logs *only if status is Confirmed*
        if (status === ChallanStatus.Confirmed) {
          await tx.product.update({
            where: { id: snapshot.productId },
            data: { currentStock: { decrement: snapshot.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              productId: snapshot.productId,
              quantityChanged: snapshot.quantity,
              movementType: MovementType.OUT,
              reason: `Sales Challan Confirmation (Immediate create: ${challanNumber})`,
              createdBy: req.user!.id,
            },
          });
        }
      }

      return challan;
    });

    const fullChallan = await prisma.salesChallan.findUnique({
      where: { id: savedChallan.id },
      include: { items: true, customer: true },
    });

    return res.status(201).json({
      message: `Sales Challan ${fullChallan?.challanNumber} created successfully in ${status} state`,
      challan: fullChallan,
    });
  } catch (error: any) {
    console.error('createChallan error:', error);
    return res.status(500).json({ message: 'Internal server error creating challan' });
  }
}

// Update Draft Challan (Cannot edit in Confirmed/Cancelled state)
export async function updateChallan(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const existingChallan = await prisma.salesChallan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingChallan) {
      return res.status(404).json({ message: 'Sales Challan not found' });
    }

    if (existingChallan.status !== ChallanStatus.Draft) {
      return res.status(400).json({
        message: 'Cannot edit challan. Only sales challans in Draft state can be updated.',
      });
    }

    const parseResult = challanCreateSchema.partial().safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const { customerId, items } = parseResult.data;

    let updateData: any = {};
    if (customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) return res.status(404).json({ message: 'Customer not found' });
      updateData.customerId = customerId;
    }

    // If items are provided, delete existing items, verify new products, create items, and calculate new totals
    if (items && items.length > 0) {
      const itemsWithSnapshots: any[] = [];
      let calculatedTotalQty = 0;
      let calculatedTotalAmount = 0;

      for (const item of items) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          return res.status(404).json({ message: `Product with ID ${item.productId} not found` });
        }

        const unitPrice = Number(product.unitPrice);
        const subtotal = unitPrice * item.quantity;
        calculatedTotalQty += item.quantity;
        calculatedTotalAmount += subtotal;

        itemsWithSnapshots.push({
          productId: product.id,
          productNameSnapshot: product.productName,
          skuSnapshot: product.sku,
          unitPriceSnapshot: product.unitPrice,
          quantity: item.quantity,
          subtotal: subtotal,
        });
      }

      updateData.totalQuantity = calculatedTotalQty;
      updateData.totalAmount = calculatedTotalAmount;

      const updatedChallan = await prisma.$transaction(async (tx) => {
        // Remove old items
        await tx.salesChallanItem.deleteMany({ where: { challanId: id } });

        // Create new items
        for (const itemInfo of itemsWithSnapshots) {
          await tx.salesChallanItem.create({
            data: {
              challanId: id,
              productId: itemInfo.productId,
              productNameSnapshot: itemInfo.productNameSnapshot,
              skuSnapshot: itemInfo.skuSnapshot,
              unitPriceSnapshot: itemInfo.unitPriceSnapshot,
              quantity: itemInfo.quantity,
              subtotal: itemInfo.subtotal,
            },
          });
        }

        // Update Challan headers
        return tx.salesChallan.update({
          where: { id },
          data: updateData,
        });
      });

      const fullChallan = await prisma.salesChallan.findUnique({
        where: { id: updatedChallan.id },
        include: { items: true, customer: true },
      });
      return res.status(200).json({ message: 'Challan updated successfully', challan: fullChallan });
    } else {
      // Just update header parameters e.g. customer
      const updatedChallan = await prisma.salesChallan.update({
        where: { id },
        data: updateData,
        include: { items: true, customer: true },
      });
      return res.status(200).json({ message: 'Challan updated successfully', challan: updatedChallan });
    }
  } catch (error: any) {
    console.error('updateChallan error:', error);
    return res.status(500).json({ message: 'Internal server error updating challan' });
  }
}

// Confirm Challan (Draft -> Confirmed, Deduct Stock atomically)
export async function confirmChallan(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) {
      return res.status(404).json({ message: 'Sales Challan not found' });
    }

    if (challan.status !== ChallanStatus.Draft) {
      return res.status(409).json({
        message: `Only Draft challans can be confirmed. Current status: ${challan.status}`,
      });
    }

    // 1. Validate stocks for all items in the draft
    for (const item of challan.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return res.status(404).json({ message: `Product '${item.productNameSnapshot}' not found` });
      }
      if (product.currentStock < item.quantity) {
        return res.status(409).json({
          message: `Insufficient stock for product '${product.productName}'. Available: ${product.currentStock}, requested for confirmation: ${item.quantity}`,
        });
      }
    }

    // 2. Perform atomic updates & confirmation in transaction
    const confirmed = await prisma.$transaction(async (tx) => {
      for (const item of challan.items) {
        // Deduct inventory
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } },
        });

        // Log StockMovement OUT
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantityChanged: item.quantity,
            movementType: MovementType.OUT,
            reason: `Sales Challan Confirmation (${challan.challanNumber})`,
            createdBy: req.user!.id,
          },
        });
      }

      // Mark challan status as Confirmed
      return tx.salesChallan.update({
        where: { id },
        data: { status: ChallanStatus.Confirmed },
        include: { items: true, customer: true },
      });
    });

    return res.status(200).json({
      message: `Challan ${confirmed.challanNumber} confirmed successfully. Inventory deducted.`,
      challan: confirmed,
    });
  } catch (error: any) {
    console.error('confirmChallan error:', error);
    return res.status(500).json({ message: 'Internal server error confirming challan' });
  }
}

// Cancel Challan (Workflow allows inventory restoration if cancelling Confirmed)
export async function cancelChallan(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) {
      return res.status(404).json({ message: 'Sales Challan not found' });
    }

    if (challan.status === ChallanStatus.Cancelled) {
      return res.status(409).json({ message: 'Challan is already cancelled' });
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      // If it was already confirmed, we need to return items to stock!
      if (challan.status === ChallanStatus.Confirmed) {
        for (const item of challan.items) {
          // Increment stock back
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          });

          // Log stock IN movement
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantityChanged: item.quantity,
              movementType: MovementType.IN,
              reason: `Sales Challan Cancellation (${challan.challanNumber}) - Restored Stock`,
              createdBy: req.user!.id,
            },
          });
        }
      }

      // Update status to Cancelled
      return tx.salesChallan.update({
        where: { id },
        data: { status: ChallanStatus.Cancelled },
        include: { items: true, customer: true },
      });
    });

    return res.status(200).json({
      message: `Challan ${cancelled.challanNumber} cancelled successfully. Inventory restored.`,
      challan: cancelled,
    });
  } catch (error: any) {
    console.error('cancelChallan error:', error);
    return res.status(500).json({ message: 'Internal server error cancelling challan' });
  }
}
