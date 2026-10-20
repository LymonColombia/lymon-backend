-- Reservations are no longer imported from external platforms, so the id they
-- carried from the origin platform goes away. Dropping the column also drops
-- the partial unique index on (external_reservation_id, source).
ALTER TABLE reservations
  DROP COLUMN external_reservation_id;
