import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reservation = await prisma.reservation.findUnique({ where: { id: params.id } });
    if (!reservation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (reservation.status !== 'PENDING') {
      return NextResponse.json({ error: `Already ${reservation.status.toLowerCase()}` }, { status: 400 });
    }
    if (new Date() > reservation.expiresAt) {
      await prisma.$transaction([
        prisma.reservation.update({ where: { id: params.id }, data: { status: 'RELEASED' } }),
        prisma.stock.update({
          where: { productId_warehouseId: { productId: reservation.productId, warehouseId: reservation.warehouseId } },
          data: { reserved: { decrement: reservation.quantity } }
        })
      ]);
      return NextResponse.json({ error: 'Reservation has expired' }, { status: 410 });
    }
    const [confirmed] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id: params.id },
        data: { status: 'CONFIRMED' },
        include: { product: true, warehouse: true }
      }),
      prisma.stock.update({
        where: { productId_warehouseId: { productId: reservation.productId, warehouseId: reservation.warehouseId } },
        data: {
          total: { decrement: reservation.quantity },
          reserved: { decrement: reservation.quantity }
        }
      })
    ]);
    return NextResponse.json(confirmed);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}