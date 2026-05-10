-- order_number_seq drives the human-readable "ORD-YYYY-NNNN" identifier.
-- Generated server-side in OrdersService.create() (Stage 2.5):
--   1. SELECT nextval('order_number_seq') in the same connection that performs INSERT.
--   2. format = 'ORD-' || <year of created_at> || '-' || lpad(<seq>, 4, '0').
--
-- We deliberately do NOT reset the counter per year — keeping a single global
-- sequence is atomic, gap-tolerant, and removes the need for a side table or
-- SERIALIZABLE retry loop. After 9999 orders in a year the padding just
-- widens (ORD-2026-12345); the format is forward compatible.
CREATE SEQUENCE "order_number_seq" START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;
