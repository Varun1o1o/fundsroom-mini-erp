import { PrismaClient, Role, CustomerType, CustomerStatus, MovementType, ChallanStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clean existing data (order matters due to foreign key constraints)
  await prisma.salesChallanItem.deleteMany({});
  await prisma.salesChallan.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.customerFollowUp.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Purged existing data.');

  // 2. Create Users
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const adminUser = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@example.com',
      passwordHash,
      role: Role.Admin,
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      name: 'Sales Manager',
      email: 'sales@example.com',
      passwordHash,
      role: Role.Sales,
    },
  });

  const warehouseUser = await prisma.user.create({
    data: {
      name: 'Warehouse Keeper',
      email: 'warehouse@example.com',
      passwordHash,
      role: Role.Warehouse,
    },
  });

  const accountsUser = await prisma.user.create({
    data: {
      name: 'Accounts officer',
      email: 'accounts@example.com',
      passwordHash,
      role: Role.Accounts,
    },
  });

  console.log('Created 4 demo users.');

  // 3. Create Customers
  const customerA = await prisma.customer.create({
    data: {
      customerName: 'Retail Customer A',
      mobileNumber: '9876543210',
      email: 'customer.a@example.com',
      businessName: 'A Stores',
      gstNumber: '27AAAAA1111A1Z1',
      customerType: CustomerType.Retail,
      address: 'Shop 12, Main Street, Mumbai, MH - 400001',
      status: CustomerStatus.Active,
      followUpDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      notes: 'Prefers deliveries in morning. Promptpayer.',
    },
  });

  const customerB = await prisma.customer.create({
    data: {
      customerName: 'Wholesale Corp B',
      mobileNumber: '9876543211',
      email: 'customer.b@example.com',
      businessName: 'B Enterprises',
      gstNumber: '27BBBBB2222B1Z2',
      customerType: CustomerType.Wholesale,
      address: 'Plot 45, MIDC Industrial Area, Pune, MH - 411044',
      status: CustomerStatus.Active,
      followUpDate: new Date(),
      notes: 'Requires 30 days credit terms usually.',
    },
  });

  const customerC = await prisma.customer.create({
    data: {
      customerName: 'Distributor C',
      mobileNumber: '9876543212',
      email: 'customer.c@example.com',
      businessName: 'C Logistics',
      gstNumber: '27CCCCC3333C1Z3',
      customerType: CustomerType.Distributor,
      address: 'Warehouse A1, Port Road, Navi Mumbai, MH - 400703',
      status: CustomerStatus.Active,
      notes: 'Our primary logistics and distributor partner.',
    },
  });

  const customerD = await prisma.customer.create({
    data: {
      customerName: 'Lead Customer D',
      mobileNumber: '9876543213',
      email: 'customer.d@example.com',
      businessName: 'D Retailers',
      customerType: CustomerType.Retail,
      address: 'General Market, Nagpur, MH - 440002',
      status: CustomerStatus.Lead,
      notes: 'Expressed interest in grain imports. Need to follow up with quotes.',
    },
  });

  const customerE = await prisma.customer.create({
    data: {
      customerName: 'Inactive Wholesale E',
      mobileNumber: '9876543214',
      email: 'customer.e@example.com',
      businessName: 'E Trades',
      customerType: CustomerType.Wholesale,
      address: 'Trading Hub, Nashik, MH - 422001',
      status: CustomerStatus.Inactive,
      notes: 'No communications in 6 months due to local vendor switch.',
    },
  });

  console.log('Created 5 customers.');

  // Create follow up history for Customer A
  await prisma.customerFollowUp.create({
    data: {
      customerId: customerA.id,
      note: 'Initial call: Customer A is very interested in retail deliveries.',
      followUpDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      createdBy: salesUser.id,
    },
  });

  await prisma.customerFollowUp.create({
    data: {
      customerId: customerA.id,
      note: 'Sent price list of standard spices and grains.',
      followUpDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      createdBy: salesUser.id,
    },
  });

  console.log('Added initial CRM follow-ups.');

  // 4. Create Products
  const productsData = [
    { productName: 'Rice 25kg', sku: 'PROD-RICE-25', category: 'Grains', unitPrice: 1200.00, currentStock: 5, minimumStockAlertQuantity: 10, warehouseLocation: 'Aisles A-3' },
    { productName: 'Wheat Flour 10kg', sku: 'PROD-WHEAT-10', category: 'Grains', unitPrice: 450.00, currentStock: 25, minimumStockAlertQuantity: 5, warehouseLocation: 'Aisles A-4' },
    { productName: 'Sugar 50kg', sku: 'PROD-SUGAR-50', category: 'Essentials', unitPrice: 2200.00, currentStock: 15, minimumStockAlertQuantity: 10, warehouseLocation: 'Aisles B-1' },
    { productName: 'Cooking Oil 15L', sku: 'PROD-OIL-15', category: 'Oil & Fats', unitPrice: 1800.00, currentStock: 8, minimumStockAlertQuantity: 12, warehouseLocation: 'Aisles C-2' },
    { productName: 'Salt 1kg', sku: 'PROD-SALT-01', category: 'Essentials', unitPrice: 25.00, currentStock: 100, minimumStockAlertQuantity: 20, warehouseLocation: 'Aisles B-2' },
    { productName: 'Red Lentils 5kg', sku: 'PROD-LENTIL-05', category: 'Pulses', unitPrice: 400.00, currentStock: 40, minimumStockAlertQuantity: 15, warehouseLocation: 'Aisles A-1' },
    { productName: 'Tea Powder 1kg', sku: 'PROD-TEA-01', category: 'Beverages', unitPrice: 320.00, currentStock: 3, minimumStockAlertQuantity: 8, warehouseLocation: 'Aisles D-1' },
    { productName: 'Coffee Bean 1kg', sku: 'PROD-COFFE-01', category: 'Beverages', unitPrice: 850.00, currentStock: 12, minimumStockAlertQuantity: 5, warehouseLocation: 'Aisles D-2' },
    { productName: 'Soap Pack of 6', sku: 'PROD-SOAP-06', category: 'Hygiene', unitPrice: 210.00, currentStock: 30, minimumStockAlertQuantity: 10, warehouseLocation: 'Aisles E-3' },
    { productName: 'Detergent 5kg', sku: 'PROD-DET-05', category: 'Hygiene', unitPrice: 550.00, currentStock: 2, minimumStockAlertQuantity: 6, warehouseLocation: 'Aisles E-4' },
  ];

  const dbProducts = [];
  for (const item of productsData) {
    const prod = await prisma.product.create({
      data: item,
    });
    dbProducts.push(prod);

    // Create Initial Stock Movement for each product
    await prisma.stockMovement.create({
      data: {
        productId: prod.id,
        quantityChanged: prod.currentStock,
        movementType: MovementType.IN,
        reason: 'Initial Inventory Seeding',
        createdBy: warehouseUser.id,
      },
    });
  }

  console.log('Created 10 products with initial stock movements.');

  // 5. Create Sample Sales Challans
  // A. A Draft Challan (won't affect stock)
  const draftChallan = await prisma.salesChallan.create({
    data: {
      challanNumber: 'CH-2026-0001',
      customerId: customerA.id,
      totalQuantity: 3,
      totalAmount: 1350.00, // 3 * 450 (Wheat Flour)
      status: ChallanStatus.Draft,
      createdBy: salesUser.id,
    },
  });

  await prisma.salesChallanItem.create({
    data: {
      challanId: draftChallan.id,
      productId: dbProducts[1].id, // Wheat Flour
      productNameSnapshot: dbProducts[1].productName,
      skuSnapshot: dbProducts[1].sku,
      unitPriceSnapshot: dbProducts[1].unitPrice,
      quantity: 3,
      subtotal: 1350.00,
    },
  });

  // B. A Confirmed Challan (will affect stock)
  // Let's create a confirmed challan for Sugar (50kg) - 2 units and Salt (1kg) - 10 units
  // Sugar stock: 15 -> decremented to 13.
  // Salt stock: 100 -> decremented to 90.
  // Let's set the stock values manually since it's a seed
  const confirmedChallan = await prisma.salesChallan.create({
    data: {
      challanNumber: 'CH-2026-0002',
      customerId: customerB.id,
      totalQuantity: 12,
      totalAmount: 4650.00, // (2 * 2200) + (10 * 25)
      status: ChallanStatus.Confirmed,
      createdBy: salesUser.id,
    },
  });

  const sugarProduct = dbProducts[2]; // Sugar
  const saltProduct = dbProducts[4]; // Salt

  await prisma.salesChallanItem.create({
    data: {
      challanId: confirmedChallan.id,
      productId: sugarProduct.id,
      productNameSnapshot: sugarProduct.productName,
      skuSnapshot: sugarProduct.sku,
      unitPriceSnapshot: sugarProduct.unitPrice,
      quantity: 2,
      subtotal: 4400.00,
    },
  });

  await prisma.salesChallanItem.create({
    data: {
      challanId: confirmedChallan.id,
      productId: saltProduct.id,
      productNameSnapshot: saltProduct.productName,
      skuSnapshot: saltProduct.sku,
      unitPriceSnapshot: saltProduct.unitPrice,
      quantity: 10,
      subtotal: 250.00,
    },
  });

  // Since it is confirmed, update stock values in DB
  await prisma.product.update({
    where: { id: sugarProduct.id },
    data: { currentStock: sugarProduct.currentStock - 2 },
  });

  await prisma.product.update({
    where: { id: saltProduct.id },
    data: { currentStock: saltProduct.currentStock - 10 },
  });

  // Create OUT stock movements for confirmation
  await prisma.stockMovement.create({
    data: {
      productId: sugarProduct.id,
      quantityChanged: 2,
      movementType: MovementType.OUT,
      reason: 'Confirmed Challan CH-2026-0002 Sales',
      createdBy: salesUser.id,
    },
  });

  await prisma.stockMovement.create({
    data: {
      productId: saltProduct.id,
      quantityChanged: 10,
      movementType: MovementType.OUT,
      reason: 'Confirmed Challan CH-2026-0002 Sales',
      createdBy: salesUser.id,
    },
  });

  console.log('Created confirmed challan and adjusted inventory.');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
