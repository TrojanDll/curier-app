-- Stamp the moment a paused courier returned to the shift. Needed so the
-- "available since" counter resets to the resume instant instead of the
-- much older last_returned_at (= last time a courier handed an order in).

ALTER TABLE "couriers"
  ADD COLUMN "last_resumed_at" TIMESTAMPTZ(6);
