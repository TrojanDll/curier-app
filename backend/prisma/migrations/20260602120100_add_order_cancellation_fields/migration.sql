-- Cancellation audit columns. Both nullable, so existing rows stay valid and
-- no backfill is required.

-- AlterTable
ALTER TABLE "orders"
  ADD COLUMN "cancelled_at" TIMESTAMPTZ(6),
  ADD COLUMN "cancellation_reason" TEXT;
