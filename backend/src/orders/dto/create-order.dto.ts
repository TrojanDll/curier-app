/**
 * Body for `POST /api/admin/orders`. class-validator wiring lands in 2.14.
 *
 * `price` is optional at the API level — DB schema allows NULL — even though
 * the admin form may surface it as required. `orderNumber`, `status`,
 * `courierId`, `createdByAdminId`, and any audit timestamps are server-set
 * and therefore not in the DTO. Auto-assign is Stage 2.6, so the order is
 * created with `status='new'` and `courierId=null`.
 */
export class CreateOrderDto {
  customerName!: string;
  customerPhone!: string;
  deliveryAddress!: string;
  productDescription!: string;
  comments?: string | null;
  /** Decimal amount as a string ("123.45") to avoid float drift on the wire. */
  price?: string | null;
}
