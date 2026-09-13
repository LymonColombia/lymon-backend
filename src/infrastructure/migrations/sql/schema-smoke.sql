-- Does the schema hold? Run it against a database migrated with `pnpm db:deploy`:
--   docker compose exec -T postgres psql -U lymon -d lymon -v ON_ERROR_STOP=1 < schema-smoke.sql
-- Silence + "SMOKE OK" = every constraint below fired the way it should.
-- Everything runs in one transaction and rolls back, so it leaves no rows behind.

BEGIN;

-- the expect() calls below return nothing useful; only failures speak up
\o /dev/null

-- Runs stmt and demands it fail with a specific SQLSTATE.
-- 23503 = FK violation, 23505 = unique violation, 23514 = check violation.
CREATE FUNCTION pg_temp.expect(stmt text, want text) RETURNS void AS $$
BEGIN
  EXECUTE stmt;
  RAISE EXCEPTION 'expected SQLSTATE % but it succeeded: %', want, stmt;
EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE <> want THEN
    RAISE EXCEPTION 'expected SQLSTATE % got % (%) for: %', want, SQLSTATE, SQLERRM, stmt;
  END IF;
END $$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------- two tenants, A and B
INSERT INTO tenants (name, slug, plan, owner_email)
VALUES ('Tenant A', 'a', 'TRIAL', 'a@example.com'),
       ('Tenant B', 'b', 'TRIAL', 'b@example.com');

INSERT INTO users (tenant_id, email, password_hash, is_owner)
SELECT id, slug || '@example.com', 'hash', true FROM tenants;

INSERT INTO properties (tenant_id, name, slug, description, property_type, address, city,
                        state, country, zip_code, lat, lng, check_in_time, check_out_time,
                        cancellation_policy, host_phone, host_email)
SELECT id, 'Property ' || name, slug, 'd', 'HOTEL', 'street', 'city', 'state', 'CO', '0',
       4.6, -74.0, '15:00', '11:00', 'FLEXIBLE', '+57', 'host@example.com'
FROM tenants;

INSERT INTO units (tenant_id, property_id, name, description, inventory_count, max_guests,
                   standard_guests, bathrooms_count, price_per_night)
SELECT tenant_id, id, 'Unit', 'd', 1, 4, 2, 1, 250000 FROM properties;

INSERT INTO guests (tenant_id, full_name, primary_email)
SELECT id, 'Guest', slug || '.guest@example.com' FROM tenants;

-- roles are global and the boot seed may have put them there already
INSERT INTO roles (name, permissions) VALUES ('STAFF', ARRAY['PROPERTY_VIEW'])
ON CONFLICT (name) DO NOTHING;

CREATE TEMP VIEW a AS
  SELECT t.id AS tenant_id, p.id AS property_id, u.id AS unit_id,
         g.id AS guest_id, usr.id AS user_id, r.id AS role_id
  FROM tenants t
  JOIN properties p ON p.tenant_id = t.id
  JOIN units u      ON u.property_id = p.id
  JOIN guests g     ON g.tenant_id = t.id
  JOIN users usr    ON usr.tenant_id = t.id
  CROSS JOIN roles r
  WHERE t.slug = 'a' AND r.name = 'STAFF';

CREATE TEMP VIEW b AS
  SELECT t.id AS tenant_id, p.id AS property_id, u.id AS unit_id
  FROM tenants t
  JOIN properties p ON p.tenant_id = t.id
  JOIN units u      ON u.property_id = p.id
  WHERE t.slug = 'b';

-- ------------------------------------------------------------------- tenant containment
SELECT pg_temp.expect($$
  INSERT INTO units (tenant_id, property_id, name, description, inventory_count,
                     max_guests, standard_guests, bathrooms_count, price_per_night)
  SELECT a.tenant_id, b.property_id, 'stolen', 'd', 1, 2, 2, 1, 1 FROM a, b $$,
  '23503');  -- unit hung off another tenant's property

SELECT pg_temp.expect($$
  INSERT INTO reservations (tenant_id, property_id, unit_id, guest_id, check_in, check_out,
                            source, guests_count, price_per_night, total_price)
  SELECT a.tenant_id, a.property_id, b.unit_id, a.guest_id, '2026-01-01', '2026-01-02',
         'MANUAL', 1, 1, 1 FROM a, b $$,
  '23503');  -- reservation on another tenant's unit

SELECT pg_temp.expect($$
  INSERT INTO reservations (tenant_id, property_id, unit_id, guest_id, check_in, check_out,
                            source, guests_count, price_per_night, total_price)
  SELECT a.tenant_id, b.property_id, a.unit_id, a.guest_id, '2026-01-01', '2026-01-02',
         'MANUAL', 1, 1, 1 FROM a, b $$,
  '23503');  -- unit does not live on the property claimed

-- ------------------------------------------------------------------------ scope grants
SELECT pg_temp.expect($$
  INSERT INTO user_role_assignments (tenant_id, user_id, role_id, scope_type, property_id)
  SELECT a.tenant_id, a.user_id, a.role_id, 'PROPERTY', b.property_id FROM a, b $$,
  '23503');  -- scoped to another tenant's property

SELECT pg_temp.expect($$
  INSERT INTO user_role_assignments (tenant_id, user_id, role_id, scope_type, property_id, unit_id)
  SELECT a.tenant_id, a.user_id, a.role_id, 'UNIT', a.property_id, b.unit_id FROM a, b $$,
  '23503');  -- scoped to another tenant's unit

SELECT pg_temp.expect($$
  INSERT INTO user_role_assignments (tenant_id, user_id, role_id, scope_type, property_id, unit_id)
  SELECT tenant_id, user_id, role_id, 'PROPERTY', property_id, unit_id FROM a $$,
  '23514');  -- PROPERTY scope must not carry a unit_id

INSERT INTO user_role_assignments (tenant_id, user_id, role_id, scope_type)
SELECT tenant_id, user_id, role_id, 'TENANT' FROM a;

SELECT pg_temp.expect($$
  INSERT INTO user_role_assignments (tenant_id, user_id, role_id, scope_type)
  SELECT tenant_id, user_id, role_id, 'TENANT' FROM a $$,
  '23505');  -- same grant twice (NULLS NOT DISTINCT)

-- ------------------------------------------------------- reservation numbering + dates
-- three separate statements on purpose: max()+1 reads the pre-statement snapshot, so a
-- single multi-row INSERT would hand every row the same number. Real inserts are one
-- reservation per statement, which is exactly what the app does.
DO $$
DECLARE n int;
BEGIN
  FOR n IN 0..2 LOOP
    INSERT INTO reservations (tenant_id, property_id, unit_id, guest_id, check_in, check_out,
                              source, guests_count, price_per_night, total_price, reservation_number)
    SELECT a.tenant_id, a.property_id, a.unit_id, a.guest_id,
           date '2026-01-01' + n, date '2026-01-02' + n, 'MANUAL', 1, 1, 1,
           coalesce((SELECT max(reservation_number) FROM reservations r
                     WHERE r.tenant_id = a.tenant_id), 0) + 1
    FROM a;
  END LOOP;
END $$;

DO $$
DECLARE got bigint[];
BEGIN
  -- scoped to this tenant: the boot seed may have left rows under other tenants
  SELECT array_agg(r.reservation_number ORDER BY r.reservation_number) INTO got
  FROM reservations r JOIN a ON a.tenant_id = r.tenant_id;
  IF got <> ARRAY[1, 2, 3]::bigint[] THEN
    RAISE EXCEPTION 'reservation numbering gave %, wanted {1,2,3}', got;
  END IF;
END $$;

SELECT pg_temp.expect($$
  INSERT INTO reservations (tenant_id, property_id, unit_id, guest_id, check_in, check_out,
                            source, guests_count, price_per_night, total_price, reservation_number)
  SELECT tenant_id, property_id, unit_id, guest_id, '2026-06-01', '2026-06-02',
         'MANUAL', 1, 1, 1, 3 FROM a $$,
  '23505');  -- reservation_number reused within the tenant

SELECT pg_temp.expect($$
  INSERT INTO reservations (tenant_id, property_id, unit_id, guest_id, check_in, check_out,
                            source, guests_count, price_per_night, total_price)
  SELECT tenant_id, property_id, unit_id, guest_id, '2026-06-02', '2026-06-01',
         'MANUAL', 1, 1, 1 FROM a $$,
  '23514');  -- check_out before check_in

SELECT pg_temp.expect($$
  INSERT INTO reservations (tenant_id, property_id, unit_id, guest_id, check_in, check_out,
                            source, guests_count, price_per_night, total_price)
  SELECT tenant_id, property_id, unit_id, guest_id, '2026-07-01', '2026-07-02',
         'AIRBNB', 1, 1, 1 FROM a $$,
  '23514');  -- source outside MANUAL|DIRECT

\o
\echo SMOKE OK

ROLLBACK;
