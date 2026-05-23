import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.reservation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // Create warehouses
  const mumbai = await prisma.warehouse.create({
    data: { name: 'Mumbai Hub', location: 'Mumbai, Maharashtra' },
  });
  const delhi = await prisma.warehouse.create({
    data: { name: 'Delhi Hub', location: 'Delhi, NCR' },
  });
  const bangalore = await prisma.warehouse.create({
    data: { name: 'Bangalore Hub', location: 'Bangalore, Karnataka' },
  });

  console.log('✅ Warehouses created');

  // Create products with stock
  const productsData = [
    {
      name: 'Sony WH-1000XM5',
      description: 'Industry-leading noise cancelling wireless headphones with 30-hour battery life.',
      price: 24999,
      category: 'Electronics',
      stocks: [
        { warehouseId: mumbai.id, total: 5, reserved: 0 },
        { warehouseId: delhi.id, total: 3, reserved: 0 },
        { warehouseId: bangalore.id, total: 2, reserved: 0 },
      ],
    },
    {
      name: 'Apple Watch SE (2nd Gen)',
      description: 'Powerful smartwatch with crash detection, heart rate monitoring, and GPS.',
      price: 29999,
      category: 'Wearables',
      stocks: [
        { warehouseId: mumbai.id, total: 4, reserved: 0 },
        { warehouseId: delhi.id, total: 2, reserved: 0 },
        { warehouseId: bangalore.id, total: 1, reserved: 0 },
      ],
    },
    {
      name: 'Nike Air Max 270',
      description: 'Iconic sneakers with Max Air cushioning for all-day comfort and style.',
      price: 12995,
      category: 'Footwear',
      stocks: [
        { warehouseId: mumbai.id, total: 8, reserved: 0 },
        { warehouseId: delhi.id, total: 6, reserved: 0 },
        { warehouseId: bangalore.id, total: 4, reserved: 0 },
      ],
    },
    {
      name: 'Kindle Paperwhite',
      description: 'The thinnest, lightest Kindle Paperwhite with a glare-free display.',
      price: 14999,
      category: 'Electronics',
      stocks: [
        { warehouseId: mumbai.id, total: 1, reserved: 0 },
        { warehouseId: delhi.id, total: 0, reserved: 0 },
        { warehouseId: bangalore.id, total: 3, reserved: 0 },
      ],
    },
    {
      name: 'JBL Flip 6',
      description: 'Portable Bluetooth speaker with powerful sound and IP67 waterproofing.',
      price: 8999,
      category: 'Electronics',
      stocks: [
        { warehouseId: mumbai.id, total: 10, reserved: 0 },
        { warehouseId: delhi.id, total: 7, reserved: 0 },
        { warehouseId: bangalore.id, total: 5, reserved: 0 },
      ],
    },
    {
      name: 'Levi\'s 511 Slim Jeans',
      description: 'Classic slim fit jeans in premium stretch denim for everyday wear.',
      price: 3999,
      category: 'Apparel',
      stocks: [
        { warehouseId: mumbai.id, total: 15, reserved: 0 },
        { warehouseId: delhi.id, total: 12, reserved: 0 },
        { warehouseId: bangalore.id, total: 8, reserved: 0 },
      ],
    },
  ];

  for (const { stocks, ...productData } of productsData) {
    const product = await prisma.product.create({ data: productData });
    for (const stock of stocks) {
      await prisma.stock.create({
        data: { productId: product.id, ...stock },
      });
    }
  }

  console.log('✅ Products and stocks created');
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
