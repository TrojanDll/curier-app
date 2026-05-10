/**
 * Body for `PATCH /api/admin/orders/:id`. Only allowed when `status='new'`
 * (§5) — OrdersService rejects with 409 otherwise.
 *
 * Every field is optional. Sending `comments: null` or `price: null` clears
 * the value; omitting the field leaves it untouched. Status, courier
 * assignment, and audit timestamps are managed by dedicated endpoints.
 */
export class UpdateOrderDto {
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  productDescription?: string;
  comments?: string | null;
  price?: string | null;
}
