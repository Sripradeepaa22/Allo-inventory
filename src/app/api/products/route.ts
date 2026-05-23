import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        stocks: {
          include: { warehouse: true },
          orderBy: { warehouse: { name: 'asc' } },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = products.map((p) => ({
      ...p,
      stocks: p.stocks.map((s) => ({
        ...s,
        available: Math.max(0, s.total - s.reserved),
      })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET /api/products]', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
