import { z } from 'zod';

export const ReserveSchema = z.object({
  productId: z.string().min(1, 'Product ID required'),
  warehouseId: z.string().min(1, 'Warehouse ID required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
});

export const ReservationStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'RELEASED']);

export type ReserveInput = z.infer<typeof ReserveSchema>;

export interface StockWithWarehouse {
  id: string;
  productId: string;
  warehouseId: string;
  total: number;
  reserved: number;
  available: number;
  warehouse: { id: string; name: string; location: string };
}

export interface ProductWithStocks {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  stocks: StockWithWarehouse[];
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export interface ReservationDetail {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED';
  expiresAt: string;
  createdAt: string;
  product: { id: string; name: string; price: number; description: string | null };
  warehouse: { id: string; name: string; location: string };
}
