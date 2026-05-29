import type { Order, OrderPriority, OrderStatus } from '@prisma/client';
import type { PhotoMeta } from '../photos/photos.service';

/**
 * Order mapping helpers — extracted out of `OrdersService` so they're reachable
 * from `RealtimeGateway` (2.9) without dragging in the whole service. Both
 * shapes plus the two `to...Response` functions live here; the service and the
 * gateway import what they need.
 */

export interface OrderAdminResponse {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  productDescription: string;
  comments: string | null;
  /** Decimal serialised as "123.45" or null. Admin-only field per §15.1. */
  price: string | null;
  status: OrderStatus;
  priority: OrderPriority;
  courierId: string | null;
  createdByAdminId: string;
  createdAt: string;
  assignedAt: string | null;
  pickedUpAt: string | null;
  nearCustomerAt: string | null;
  deliveredAt: string | null;
  returnedAt: string | null;
  /**
   * Photo metadata. Populated only on detail/create responses
   * (`findOneAdmin`, `create`, `update`, `reassign`); list endpoints emit `[]`
   * to keep the paginated query light. Clients fetch bytes via
   * `GET /api/admin/orders/:id/photo/:photoId`.
   */
  photos: PhotoMeta[];
}

/** Same as admin minus `price` and `createdByAdminId` per §15.1. */
export interface OrderCourierResponse {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  productDescription: string;
  comments: string | null;
  status: OrderStatus;
  priority: OrderPriority;
  courierId: string | null;
  createdAt: string;
  assignedAt: string | null;
  pickedUpAt: string | null;
  nearCustomerAt: string | null;
  deliveredAt: string | null;
  returnedAt: string | null;
  /**
   * Photo metadata. Populated only on detail/transition responses
   * (`findOneCourier`, `updateStatus`); list endpoints emit `[]`. Clients
   * fetch bytes via `GET /api/courier/orders/:id/photo/:photoId`.
   */
  photos: PhotoMeta[];
}

export function toOrderAdminResponse(
  o: Order,
  photos: PhotoMeta[],
): OrderAdminResponse {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    deliveryAddress: o.deliveryAddress,
    productDescription: o.productDescription,
    comments: o.comments,
    price: o.price ? o.price.toFixed(2) : null,
    status: o.status,
    priority: o.priority,
    courierId: o.courierId,
    createdByAdminId: o.createdByAdminId,
    createdAt: o.createdAt.toISOString(),
    assignedAt: o.assignedAt ? o.assignedAt.toISOString() : null,
    pickedUpAt: o.pickedUpAt ? o.pickedUpAt.toISOString() : null,
    nearCustomerAt: o.nearCustomerAt ? o.nearCustomerAt.toISOString() : null,
    deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString() : null,
    returnedAt: o.returnedAt ? o.returnedAt.toISOString() : null,
    photos,
  };
}

export function toOrderCourierResponse(
  o: Order,
  photos: PhotoMeta[],
): OrderCourierResponse {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    deliveryAddress: o.deliveryAddress,
    productDescription: o.productDescription,
    comments: o.comments,
    status: o.status,
    priority: o.priority,
    courierId: o.courierId,
    createdAt: o.createdAt.toISOString(),
    assignedAt: o.assignedAt ? o.assignedAt.toISOString() : null,
    pickedUpAt: o.pickedUpAt ? o.pickedUpAt.toISOString() : null,
    nearCustomerAt: o.nearCustomerAt ? o.nearCustomerAt.toISOString() : null,
    deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString() : null,
    returnedAt: o.returnedAt ? o.returnedAt.toISOString() : null,
    photos,
  };
}
