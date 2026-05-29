-- Order urgency tier driving the weighted auto-assign scorer + queue ordering (§8).

-- CreateEnum
CREATE TYPE "order_priority" AS ENUM ('low', 'normal', 'high');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "priority" "order_priority" NOT NULL DEFAULT 'normal';

-- CreateIndex
CREATE INDEX "orders_status_priority_created_at_idx" ON "orders"("status", "priority", "created_at");
