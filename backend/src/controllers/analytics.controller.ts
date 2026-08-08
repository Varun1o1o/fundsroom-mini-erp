import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../prisma';

export async function getDashboardStats(req: AuthenticatedRequest, res: Response) {
  try {
    // 1. Customer Counts by Status
    const customerStats = await prisma.customer.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const customersStatusBreakdown = {
      Lead: 0,
      Active: 0,
      Inactive: 0,
    };

    customerStats.forEach((stat) => {
      const statusKey = stat.status as keyof typeof customersStatusBreakdown;
      if (customersStatusBreakdown[statusKey] !== undefined) {
        customersStatusBreakdown[statusKey] = stat._count._all;
      }
    });

    const totalCustomers = Object.values(customersStatusBreakdown).reduce((a, b) => a + b, 0);

    // 2. Stock Alerts Count
    const productsInstance = await prisma.product.findMany({
      select: { currentStock: true, minimumStockAlertQuantity: true },
    });
    const lowStockCount = productsInstance.filter(
      (p) => p.currentStock <= p.minimumStockAlertQuantity
    ).length;

    // 3. Sales/Challan Revenue
    const challanStats = await prisma.salesChallan.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { totalAmount: true },
    });

    let totalConfirmedAmount = 0.00;
    let confirmedCount = 0;
    let draftCount = 0;
    let cancelledCount = 0;

    challanStats.forEach((stat) => {
      if (stat.status === 'Confirmed') {
        totalConfirmedAmount = Number(stat._sum.totalAmount) || 0;
        confirmedCount = stat._count._all;
      } else if (stat.status === 'Draft') {
        draftCount = stat._count._all;
      } else if (stat.status === 'Cancelled') {
        cancelledCount = stat._count._all;
      }
    });

    // 4. Products by category
    const categoryStats = await prisma.product.groupBy({
      by: ['category'],
      _count: { _all: true },
    });

    const categoriesBreakdown = categoryStats.map((stat) => ({
      category: stat.category,
      count: stat._count._all,
    }));

    // 5. Recent items lists
    const recentMovements = await prisma.stockMovement.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { productName: true, sku: true } },
      },
    });

    const recentChallans = await prisma.salesChallan.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { customerName: true } },
      },
    });

    // 6. User list overview (Roles breakdown)
    const userRoleStats = await prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
    });

    const rolesBreakdown = userRoleStats.map((stat) => ({
      role: stat.role,
      count: stat._count._all,
    }));

    return res.status(200).json({
      summary: {
        totalCustomers,
        customersStatusBreakdown,
        lowStockItemsCount: lowStockCount,
        confirmedChallansCount: confirmedCount,
        totalRevenue: totalConfirmedAmount,
        draftChallansCount: draftCount,
        cancelledChallansCount: cancelledCount,
      },
      categoriesBreakdown,
      rolesBreakdown,
      recentMovements,
      recentChallans,
    });
  } catch (error: any) {
    console.error('getDashboardStats error:', error);
    return res.status(500).json({ message: 'Internal server error calculating analytics' });
  }
}
