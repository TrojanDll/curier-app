-- Stamp the moment a courier was paused / fired so the admin UI can show
-- "as long" they've been in that state without conflating with profile
-- edits that touch `updated_at`. NULL means "not in that state right now".

ALTER TABLE "couriers"
  ADD COLUMN "paused_at" TIMESTAMPTZ(6),
  ADD COLUMN "fired_at"  TIMESTAMPTZ(6);

-- Backfill so already-paused / already-fired couriers don't appear as if
-- they just changed state. `updated_at` is the closest proxy we have.
UPDATE "couriers"
SET    "paused_at" = "updated_at"
WHERE  "is_paused" = true AND "paused_at" IS NULL;

UPDATE "couriers"
SET    "fired_at" = "updated_at"
WHERE  "is_active" = false AND "fired_at" IS NULL;
