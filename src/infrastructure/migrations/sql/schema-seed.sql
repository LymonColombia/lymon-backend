-- Sample data so there is something to query. Not fixtures for a test suite - just a
-- believable tenant you can poke at:
--   docker compose exec -T postgres psql -U lymon -d lymon -v ON_ERROR_STOP=1 < schema-seed.sql
--
-- Safe to re-run: it deletes its own tenants first and everything hangs off them by
-- ON DELETE CASCADE. Anything you added by hand under those tenants goes too.

BEGIN;

DELETE FROM tenants WHERE slug IN ('costa', 'andina');

-- roles are global, so upsert instead of delete. Permission lists copied from
-- src/domain/role/value-objects/permission.vo.ts.
INSERT INTO roles (name, permissions) VALUES
  ('ADMIN', ARRAY['PROPERTY_VIEW','PROPERTY_CREATE','PROPERTY_EDIT','UNIT_VIEW','UNIT_CREATE',
                  'UNIT_EDIT','RESERVATION_VIEW','RESERVATION_CREATE','RESERVATION_EDIT',
                  'FINANCE_VIEW','FINANCE_CREATE','FINANCE_EDIT','CRM_VIEW','CRM_MANAGE',
                  'TENANT_USERS_MANAGE','AUDIT_VIEW','EXPERIENCE_EDIT','INCIDENT_REPORT_CREATE',
                  'INCIDENT_REPORT_READ','INCIDENT_REPORT_EDIT','INCIDENT_REPORT_DELETE']),
  ('STAFF', ARRAY['PROPERTY_VIEW','UNIT_VIEW','RESERVATION_VIEW','RESERVATION_CREATE',
                  'RESERVATION_EDIT','RESERVATION_DELETE','INCIDENT_REPORT_CREATE',
                  'INCIDENT_REPORT_READ','INCIDENT_REPORT_EDIT','INCIDENT_REPORT_DELETE'])
ON CONFLICT (name) DO UPDATE SET permissions = EXCLUDED.permissions, updated_at = now();

-- ------------------------------------------------------------------------------ tenants
-- Two of them: the second exists so you can see tenant isolation actually holding.
INSERT INTO tenants (name, slug, plan, owner_email) VALUES
  ('Costa Hoteles',  'costa',  'LYMON_PLUS', 'ana@costahoteles.co'),
  ('Andina Rentals', 'andina', 'TRIAL',      'luis@andinarentals.co');

INSERT INTO users (tenant_id, email, password_hash, is_owner, email_verified, full_name)
SELECT id, 'ana@costahoteles.co', 'x', true, true, 'Ana Restrepo' FROM tenants WHERE slug = 'costa'
UNION ALL
SELECT id, 'carlos@costahoteles.co', 'x', false, true, 'Carlos Mejia' FROM tenants WHERE slug = 'costa'
UNION ALL
SELECT id, 'diana@costahoteles.co', 'x', false, true, 'Diana Torres' FROM tenants WHERE slug = 'costa'
UNION ALL
SELECT id, 'luis@andinarentals.co', 'x', true, true, 'Luis Gomez' FROM tenants WHERE slug = 'andina';

-- --------------------------------------------------------------------------- properties
INSERT INTO properties (tenant_id, name, slug, description, property_type, address, city,
                        state, country, zip_code, lat, lng, check_in_time, check_out_time,
                        cancellation_policy, host_phone, host_email)
SELECT t.id, p.name, p.slug, p.descr, p.ptype, p.addr, p.city, p.state, 'CO', p.zip,
       p.lat, p.lng, time '15:00', time '11:00', p.policy, '+57 300 000 0000', 'ana@costahoteles.co'
FROM tenants t, (VALUES
  ('Hotel Bahia',   'hotel-bahia',   'Beachfront hotel',      'HOTEL',      'Cra 1 #10-20', 'Cartagena', 'Bolivar',   '130001', 10.399, -75.550, 'STANDARD'),
  ('Casa Getsemani','casa-getsemani','Colonial house, 4 units','CASA',      'Cll 25 #8-14', 'Cartagena', 'Bolivar',   '130001', 10.421, -75.545, 'FLEXIBLE')
) AS p(name, slug, descr, ptype, addr, city, state, zip, lat, lng, policy)
WHERE t.slug = 'costa'
UNION ALL
SELECT t.id, 'Cabana Guatavita', 'cabana-guatavita', 'Lake cabin', 'GLAMPING',
       'Km 3 via Guatavita', 'Guatavita', 'Cundinamarca', 'CO', '251001', 4.934, -73.833,
       time '16:00', time '10:00', 'STRICT', '+57 301 000 0000', 'luis@andinarentals.co'
FROM tenants t WHERE t.slug = 'andina';

-- -------------------------------------------------------------------------------- units
INSERT INTO units (tenant_id, property_id, name, description, inventory_count, max_guests,
                   standard_guests, bathrooms_count, amenities, price_per_night, bedrooms)
SELECT p.tenant_id, p.id, u.name, u.descr, u.inv, u.maxg, u.stdg, u.baths, u.amen, u.price,
       u.bedrooms::jsonb
FROM properties p, (VALUES
  ('hotel-bahia',    'Suite Vista Mar',  'Sea view suite',   3, 4, 2, 1, ARRAY['WIFI','AC','TV'],         480000, '[{"roomName":"Main","beds":[{"type":"KING","count":1}]}]'),
  ('hotel-bahia',    'Habitacion Doble', 'Twin room',        8, 2, 2, 1, ARRAY['WIFI','AC'],              260000, '[{"roomName":"Main","beds":[{"type":"DOUBLE","count":2}]}]'),
  ('casa-getsemani', 'Apto 101',         'Ground floor apt', 1, 4, 4, 2, ARRAY['WIFI','KITCHEN'],         340000, '[{"roomName":"Room 1","beds":[{"type":"QUEEN","count":1}]},{"roomName":"Room 2","beds":[{"type":"SINGLE","count":2}]}]'),
  ('casa-getsemani', 'Apto 202',         'Balcony apt',      1, 2, 2, 1, ARRAY['WIFI','KITCHEN','AC'],    300000, '[{"roomName":"Main","beds":[{"type":"QUEEN","count":1}]}]'),
  ('cabana-guatavita','Cabana Unica',    'Whole cabin',      1, 6, 4, 2, ARRAY['WIFI','FIREPLACE'],       520000, '[{"roomName":"Loft","beds":[{"type":"KING","count":1},{"type":"SOFA_BED","count":1}]}]')
) AS u(pslug, name, descr, inv, maxg, stdg, baths, amen, price, bedrooms)
WHERE p.slug = u.pslug;

-- ------------------------------------------------------------------------------- guests
INSERT INTO guests (tenant_id, full_name, primary_email, phone, country_code, status)
SELECT t.id, g.name, g.email, g.phone, g.cc, g.status
FROM tenants t, (VALUES
  ('Maria Lopez',    'maria.lopez@example.com',  '+57 310 111 1111', 'CO', 'active'),
  ('John Carter',    'john.carter@example.com',  '+1 415 222 2222',  'US', 'active'),
  ('Sofia Ramirez',  'sofia.ramirez@example.com','+57 320 333 3333', 'CO', 'active'),
  ('Peter Novak',    'peter.novak@example.com',  '+420 777 444 444', 'CZ', 'blocked')
) AS g(name, email, phone, cc, status)
WHERE t.slug = 'costa'
UNION ALL
SELECT t.id, 'Elena Vargas', 'elena.vargas@example.com', '+57 315 555 5555', 'CO', 'active'
FROM tenants t WHERE t.slug = 'andina';

-- ------------------------------------------------------------------------ role grants
-- Ana is the owner: no assignment row, the is_owner flag short-circuits both guards.
-- Carlos manages one property. Diana is limited to a single unit.
INSERT INTO user_role_assignments (tenant_id, user_id, role_id, scope_type, property_id)
SELECT u.tenant_id, u.id, r.id, 'PROPERTY', p.id
FROM users u JOIN roles r ON r.name = 'ADMIN'
             JOIN properties p ON p.tenant_id = u.tenant_id AND p.slug = 'hotel-bahia'
WHERE u.email = 'carlos@costahoteles.co';

INSERT INTO user_role_assignments (tenant_id, user_id, role_id, scope_type, property_id, unit_id)
SELECT u.tenant_id, u.id, r.id, 'UNIT', un.property_id, un.id
FROM users u JOIN roles r ON r.name = 'STAFF'
             JOIN units un ON un.tenant_id = u.tenant_id AND un.name = 'Apto 101'
WHERE u.email = 'diana@costahoteles.co';

-- ------------------------------------------------------------------------- reservations
-- One statement per row so reservation_number increments the way the app makes it:
-- max()+1 reads the pre-statement snapshot, so a multi-row INSERT numbers them all 1.
DO $$
DECLARE
  r record;
  n int := 0;
BEGIN
  FOR r IN
    SELECT u.tenant_id, u.property_id, u.id AS unit_id, g.id AS guest_id, u.price_per_night,
           v.checkin, v.nights, v.status, v.guests
    FROM (VALUES
      ('Suite Vista Mar',  'maria.lopez@example.com',   date '2026-09-10', 3, 'CHECKED_OUT', 2),
      ('Suite Vista Mar',  'john.carter@example.com',   date '2026-09-20', 2, 'CONFIRMED',   2),
      ('Habitacion Doble', 'sofia.ramirez@example.com', date '2026-09-12', 4, 'CHECKED_IN',  2),
      ('Habitacion Doble', 'maria.lopez@example.com',   date '2026-10-01', 1, 'PENDING',     1),
      ('Apto 101',         'john.carter@example.com',   date '2026-09-15', 5, 'CONFIRMED',   4),
      ('Apto 202',         'peter.novak@example.com',   date '2026-08-28', 2, 'CANCELLED',   2),
      ('Apto 202',         'sofia.ramirez@example.com', date '2026-11-05', 3, 'PENDING',     2)
    ) AS v(unit_name, guest_email, checkin, nights, status, guests)
    JOIN units u  ON u.name = v.unit_name
    JOIN guests g ON g.primary_email = v.guest_email AND g.tenant_id = u.tenant_id
    ORDER BY v.checkin
  LOOP
    n := n + 1;
    INSERT INTO reservations (tenant_id, property_id, unit_id, guest_id, check_in, check_out,
                              source, status, guests_count, price_per_night, total_price,
                              reservation_number, cancelled_at, cancellation_reason)
    VALUES (r.tenant_id, r.property_id, r.unit_id, r.guest_id, r.checkin,
            r.checkin + r.nights, 'MANUAL', r.status, r.guests, r.price_per_night,
            r.price_per_night * r.nights,
            coalesce((SELECT max(reservation_number) FROM reservations x
                      WHERE x.tenant_id = r.tenant_id), 0) + 1,
            CASE WHEN r.status = 'CANCELLED' THEN now() END,
            CASE WHEN r.status = 'CANCELLED' THEN 'Guest cancelled' END);
  END LOOP;
END $$;

-- Denormalised guest counters the CRM reads. Cancelled stays out of the totals.
UPDATE guests g SET
  total_bookings = s.bookings,
  total_nights   = s.nights,
  total_spend    = s.spend,
  last_stay_at   = s.last_stay
FROM (
  SELECT guest_id, count(*) AS bookings, sum(check_out - check_in) AS nights,
         sum(total_price) AS spend, max(check_out)::timestamptz AS last_stay
  FROM reservations WHERE status <> 'CANCELLED' GROUP BY guest_id
) s
WHERE s.guest_id = g.id;

COMMIT;

\echo 'seeded. try:'
\echo '  SELECT reservation_number, check_in, status, total_price FROM reservations ORDER BY reservation_number;'
\echo '  SELECT full_name, total_bookings, total_nights, total_spend FROM guests ORDER BY total_spend DESC;'
