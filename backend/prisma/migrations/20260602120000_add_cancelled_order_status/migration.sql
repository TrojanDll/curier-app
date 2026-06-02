-- Add 'cancelled' to the order_status enum.
--
-- Kept in its own migration on purpose: in PostgreSQL a value added via
-- ALTER TYPE ... ADD VALUE cannot be referenced in the same transaction that
-- adds it. Splitting the enum change from the column changes (next migration)
-- guarantees `prisma migrate deploy` applies cleanly on production.

-- AlterEnum
ALTER TYPE "order_status" ADD VALUE IF NOT EXISTS 'cancelled';
