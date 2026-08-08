import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../prisma';
import { z } from 'zod';
import { CustomerType, CustomerStatus } from '@prisma/client';

// Customer Validation Schemas
const customerCreateSchema = z.object({
  customerName: z.string().min(2, 'Name must be at least 2 characters'),
  mobileNumber: z.string().min(10, 'Mobile number must be at least 10 characters'),
  email: z.string().email('Invalid email address format'),
  businessName: z.string().min(2, 'Business Name must be at least 2 characters'),
  gstNumber: z.string().max(15, 'GST Number cannot exceed 15 characters').optional().nullable(),
  customerType: z.nativeEnum(CustomerType, { errorMap: () => ({ message: 'Invalid customer type' }) }),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  status: z.nativeEnum(CustomerStatus).optional().default(CustomerStatus.Lead),
  notes: z.string().min(2, 'Notes are required').default(''),
});

const followUpCreateSchema = z.object({
  note: z.string().min(5, 'Follow-up note must be at least 5 characters'),
  followUpDate: z.string().transform((str) => new Date(str)),
});

// List Customers
export async function getCustomers(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, type, search } = req.query;
    let page = parseInt(req.query.page as string || '1', 10);
    let limit = parseInt(req.query.limit as string || '10', 10);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status as CustomerStatus;
    }
    if (type) {
      where.customerType = type as CustomerType;
    }
    if (search) {
      where.OR = [
        { customerName: { contains: search as string } },
        { mobileNumber: { contains: search as string } },
        { email: { contains: search as string } },
        { businessName: { contains: search as string } },
      ];
    }

    const count = await prisma.customer.count({ where });
    const customers = await prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { challans: true },
        },
      },
    });

    return res.status(200).json({
      customers,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error: any) {
    console.error('getCustomers error:', error);
    return res.status(500).json({ message: 'Internal server error listing customers' });
  }
}

// Get Single Customer
export async function getCustomerById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        followUps: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        challans: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            challanNumber: true,
            totalQuantity: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.status(200).json({ customer });
  } catch (error: any) {
    console.error('getCustomerById error:', error);
    return res.status(500).json({ message: 'Internal server error retrieving customer' });
  }
}

// Create Customer
export async function createCustomer(req: AuthenticatedRequest, res: Response) {
  try {
    const parseResult = customerCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const customerData = parseResult.data;

    const exists = await prisma.customer.findFirst({
      where: {
        OR: [{ email: customerData.email }, { mobileNumber: customerData.mobileNumber }],
      },
    });

    if (exists) {
      return res.status(409).json({
        message: 'Customer with this email or mobile number already exists',
      });
    }

    const customer = await prisma.customer.create({
      data: {
        ...customerData,
        gstNumber: customerData.gstNumber || null,
      },
    });

    // Create automatically an initial follow-up or log entry
    if (req.user) {
      await prisma.customerFollowUp.create({
        data: {
          customerId: customer.id,
          note: customerData.notes || 'Customer profiles created in ERP.',
          followUpDate: new Date(),
          createdBy: req.user.id,
        },
      });
    }

    return res.status(201).json({
      message: 'Customer created successfully',
      customer,
    });
  } catch (error: any) {
    console.error('createCustomer error:', error);
    return res.status(500).json({ message: 'Internal server error creating customer' });
  }
}

// Update Customer
export async function updateCustomer(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    // Check customer existence
    const customer = await prisma.customer.findUnique({
      where: { id },
    });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const customerUpdateSchema = customerCreateSchema.partial();
    const parseResult = customerUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...parseResult.data,
        gstNumber: parseResult.data.gstNumber !== undefined ? parseResult.data.gstNumber || null : undefined,
      },
    });

    return res.status(200).json({
      message: 'Customer updated successfully',
      customer: updated,
    });
  } catch (error: any) {
    console.error('updateCustomer error:', error);
    return res.status(500).json({ message: 'Internal server error updating customer' });
  }
}

// Add CRM Follow-up
export async function createFollowUp(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: customerId } = req.params;
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify Customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const parseResult = followUpCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const { note, followUpDate } = parseResult.data;

    // Create follow up
    const followUp = await prisma.customerFollowUp.create({
      data: {
        customerId,
        note,
        followUpDate,
        createdBy: req.user.id,
      },
      include: {
        user: { select: { name: true, role: true } },
      },
    });

    // Update followUpDate and active status in customer table
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        followUpDate,
      },
    });

    return res.status(201).json({
      message: 'Follow-up logged successfully',
      followUp,
    });
  } catch (error: any) {
    console.error('createFollowUp error:', error);
    return res.status(500).json({ message: 'Internal server error logging follow-up' });
  }
}
