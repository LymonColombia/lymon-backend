-- Baseline for LYMON-1128. Copied verbatim from
-- src/infrastructure/migrations/sql/postgres-schema.sql (minus its BEGIN/COMMIT, which Prisma supplies).
-- Keeps CHECK constraints in migration history, where schema.prisma cannot
-- express them, so the shadow database matches the real one.

-- Postgres schema mapped 1:1 from src/domain entities.
-- Source of truth today is MongoDB (mongoose); this is the relational equivalent.
--
-- Conventions:
--   * ids            -> uuid, gen_random_uuid() (pgcrypto built in since PG13)
--   * dates          -> timestamptz
--   * domain enums   -> text + CHECK (col IN (...)); the enum stays in TS, the DB
--                       just validates the value. Adding a case = ALTER the CHECK,
--                       no type rewrite, and every driver reads it as a plain string.
--                       Exception: open-ended lists that only one service writes
--                       (roles.permissions, audit_logs.action) carry no CHECK - the
--                       TS enum is the only list, see the comments on those columns.
--   * COP amounts    -> bigint (whole pesos / cents, as the entity declares)
--   * value objects  -> flattened columns when small, jsonb when a list/blob
--   * every tenant-scoped table carries tenant_id + an index on it
--
-- ponytail: embedded VO lists (bedrooms, recurrence, cart items, traveler info,
-- attachments, guest summary) stay jsonb. Split into child tables only when you
-- need to filter or join on their inner fields.
--
-- Deliberately NOT mapped (mongo collections with no owner in src/ and no dep that
-- creates them - leftovers from removed features or another app on the same DB):
--   sessions, workflow_configs, workflow_executions
-- Do not copy these in the ETL.


CREATE EXTENSION IF NOT EXISTS citext;  -- case-insensitive emails

-- ============================================================================
-- TENANT / IDENTITY
-- ============================================================================

-- src/domain/tenant/entities/tenant.entity.ts
CREATE TABLE tenants (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL CHECK (btrim(name) <> ''),
  slug           text        NOT NULL UNIQUE,
  owner_email    citext      NOT NULL,           -- Email VO
  plan           text   NOT NULL CHECK (plan IN ('LYMON_ONE', 'LYMON_PLUS', 'LYMON_PRIME', 'TRIAL')),
  email_verified boolean     NOT NULL DEFAULT false,
  contact_phone  text,
  address        text,
  description    text,
  logo_key       text,                            -- R2 object key, not a URL
  theme          jsonb,                           -- TenantTheme { primary, secondary, accent }
  trial_ends_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
);

-- src/domain/role/entities/role.entity.ts  (system-wide, not tenant scoped)
CREATE TABLE roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text         NOT NULL UNIQUE,
  -- values come from the Permission enum, src/domain/role/value-objects/permission.vo.ts
  -- ponytail: no CHECK — rows are seeded from that enum (role-seed.service.ts) and
  -- nothing else writes here, so a constraint would only duplicate the list and make
  -- every new permission a migration. Add a permissions table + FK the day tenants
  -- build their own roles in the UI.
  permissions text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

-- src/domain/user/entities/user.entity.ts  (staff / owner)
CREATE TABLE users (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid   NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email                 citext NOT NULL,
  password_hash         text   NOT NULL,
  is_owner              boolean NOT NULL DEFAULT false,  -- UserRoleEnum OWNER | STAFF
  email_verified        boolean NOT NULL DEFAULT false,
  full_name             text,
  document              text,
  tutorial_completed    boolean NOT NULL DEFAULT false,
  reset_password_token  text,
  reset_password_expires timestamptz,
  password_changed_at   timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz,
  UNIQUE (tenant_id, id)   -- FK target, see user_role_assignments
);

-- Partial, like the mongo index it replaces (users_unique_active_email_tenant): a
-- soft-deleted user must not hold its email hostage against a re-registration.
CREATE UNIQUE INDEX users_unique_active_email_tenant
  ON users (tenant_id, email) WHERE deleted_at IS NULL;
CREATE INDEX ON users (tenant_id, deleted_at);

-- RoleAssignment[] on User: role + the one resource the scope covers.
-- Mongo stored the resources as an array; here it is one row per resource so the
-- scope target can be a real FK. The repository regroups them into the array the
-- JWT and ScopeGuard already expect.
CREATE TABLE user_role_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  user_id     uuid NOT NULL,
  role_id     uuid NOT NULL REFERENCES roles(id),   -- plain FK: roles are global
  scope_type  text NOT NULL CHECK (scope_type IN ('TENANT', 'PROPERTY', 'UNIT')),
  property_id uuid,   -- NULL for TENANT scope
  unit_id     uuid,   -- NULL unless scope_type = 'UNIT'

  CHECK (
    (scope_type = 'TENANT'   AND property_id IS NULL     AND unit_id IS NULL) OR
    (scope_type = 'PROPERTY' AND property_id IS NOT NULL AND unit_id IS NULL) OR
    (scope_type = 'UNIT'     AND property_id IS NOT NULL AND unit_id IS NOT NULL)
  ),

  -- the property/unit scope FKs are added after units is created, see below
  FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, id) ON DELETE CASCADE,

  -- NULLS NOT DISTINCT so a repeated TENANT-scope grant collides too
  UNIQUE NULLS NOT DISTINCT (user_id, role_id, scope_type, property_id, unit_id)
);
CREATE INDEX ON user_role_assignments (user_id);
CREATE INDEX ON user_role_assignments (tenant_id, property_id);

-- ============================================================================
-- PROPERTIES / UNITS
-- ============================================================================

-- src/domain/property/entities/property.entity.ts
CREATE TABLE properties (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                text NOT NULL,
  slug                text NOT NULL,
  description         text NOT NULL,
  property_type       text NOT NULL CHECK (property_type IN ('HOTEL', 'CASA', 'APARTAMENTO', 'VILLA', 'HOSTAL', 'GLAMPING')),
  address             text NOT NULL,
  city                text NOT NULL,
  state               text NOT NULL,
  country             text NOT NULL,
  zip_code            text NOT NULL,
  lat                 numeric(9,6) NOT NULL,     -- Location VO
  lng                 numeric(9,6) NOT NULL,
  check_in_time       time NOT NULL,
  check_out_time      time NOT NULL,
  cancellation_policy text NOT NULL CHECK (cancellation_policy IN ('FLEXIBLE', 'STANDARD', 'STRICT')),
  host_phone          text NOT NULL,
  host_email          citext NOT NULL,
  image_key           text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,
  UNIQUE (tenant_id, slug),
  UNIQUE (tenant_id, id)   -- FK target: lets children pin (tenant_id, property_id) together
);
CREATE INDEX ON properties (tenant_id);

-- src/domain/unit/entities/unit.entity.ts
CREATE TABLE units (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id     uuid NOT NULL,
  name            text NOT NULL,
  description     text NOT NULL,
  inventory_count integer NOT NULL CHECK (inventory_count >= 0),
  max_guests      integer NOT NULL CHECK (max_guests > 0),
  standard_guests integer NOT NULL CHECK (standard_guests > 0),
  -- Bedroom[] { roomName, beds:[{ type: KING|QUEEN|DOUBLE|SINGLE|SOFA_BED, count }] }
  bedrooms        jsonb   NOT NULL DEFAULT '[]',
  bathrooms_count integer NOT NULL CHECK (bathrooms_count >= 0),
  is_shared       boolean NOT NULL DEFAULT false,
  amenities       text[]  NOT NULL DEFAULT '{}',
  media_keys      text[]  NOT NULL DEFAULT '{}',
  price_per_night numeric(14,2) NOT NULL CHECK (price_per_night >= 0),
  rating          numeric(2,1) CHECK (rating BETWEEN 0 AND 5),
  -- ExternalIds VO, flattened: ids for the same unit on the OTA that owns it.
  external_airbnb_id  text,
  external_booking_id text,
  external_vrbo_id    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CHECK (standard_guests <= max_guests),
  -- (tenant_id, property_id) instead of property_id alone: a unit can only hang off a
  -- property of its own tenant, enforced here rather than trusted from the handler.
  FOREIGN KEY (tenant_id, property_id) REFERENCES properties (tenant_id, id) ON DELETE CASCADE,
  UNIQUE (tenant_id, property_id, id)  -- FK target for reservations
);
CREATE INDEX ON units (tenant_id);
CREATE INDEX ON units (property_id);

-- Scope targets for user_role_assignments (declared up in AUTH, added here because
-- they point at tables created below it).
-- MATCH SIMPLE (the default) ON PURPOSE: a NULL in any column switches that FK off,
-- which is what lets one table hold all three scope shapes. Do NOT "fix" these to
-- MATCH FULL - TENANT-scoped rows would stop inserting. What they buy: a property or
-- unit id from another tenant fails with 23503 instead of silently granting access.
ALTER TABLE user_role_assignments
  ADD FOREIGN KEY (tenant_id, property_id) REFERENCES properties (tenant_id, id) ON DELETE CASCADE,
  ADD FOREIGN KEY (tenant_id, property_id, unit_id) REFERENCES units (tenant_id, property_id, id) ON DELETE CASCADE;

-- ============================================================================
-- GUESTS / CRM
-- ============================================================================

-- src/domain/guest-account/entities/guest-account.entity.ts  (guest portal login)
CREATE TABLE guest_accounts (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                     citext NOT NULL UNIQUE,
  password_hash             text   NOT NULL,
  full_name                 text   NOT NULL,
  first_name                text,
  last_name                 text,
  phone                     text,
  status                    text NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'active', 'suspended')),
  email_verified            boolean NOT NULL DEFAULT false,
  email_verification_token  text,
  email_verification_expiry timestamptz,
  password_reset_token      text,
  password_reset_expiry     timestamptz,
  password_changed_at       timestamptz,
  profile_photo_key         text,
  pending_email             citext,
  email_change_token        text,
  email_change_expiry       timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- src/domain/guest/entities/guest.entity.ts  (tenant-side CRM record)
CREATE TABLE guests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  guest_account_id   uuid REFERENCES guest_accounts(id) ON DELETE SET NULL,
  document_type      text,                     -- GuestIdentity VO
  document_number    text,
  country_code       text,
  first_name         text,
  last_name          text,
  full_name          text NOT NULL,
  primary_email      citext NOT NULL,
  phone              text,
  status             text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'archived')),
  preferences        jsonb NOT NULL DEFAULT '[]',  -- GuestPreferenceItem[] (label snapshots)
  -- GuestSummary VO, denormalized on purpose (read-heavy CRM list)
  total_bookings     integer NOT NULL DEFAULT 0,
  total_nights       integer NOT NULL DEFAULT 0,
  total_spend        numeric(14,2) NOT NULL DEFAULT 0,
  last_stay_at       timestamptz,
  last_property_id   uuid REFERENCES properties(id) ON DELETE SET NULL,
  last_unit_id       uuid REFERENCES units(id) ON DELETE SET NULL,
  pending_email      citext,
  email_change_token text,
  email_change_expiry timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, primary_email),
  UNIQUE (tenant_id, id)   -- FK target, see reservations
);
CREATE INDEX ON guests (tenant_id);
CREATE INDEX ON guests (guest_account_id);

-- src/domain/guest-tag/entities/guest-tag.entity.ts
CREATE TABLE guest_tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = platform-wide tag, seeded for every tenant. The domain calls that tenant
  -- '__platform__' (GuestTag.PLATFORM_TENANT_ID), which is not a uuid and has no
  -- tenants row; the repository maps the sentinel to NULL and back.
  tenant_id  uuid REFERENCES tenants(id) ON DELETE CASCADE,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- NULLS NOT DISTINCT so two platform tags cannot share a name either
  UNIQUE NULLS NOT DISTINCT (tenant_id, name)
);

-- Guest.tags: GuestTag[]
CREATE TABLE guest_tag_assignments (
  guest_id     uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  guest_tag_id uuid NOT NULL REFERENCES guest_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (guest_id, guest_tag_id)
);

-- src/domain/guest-preference/entities/guest-preference-catalog-item.entity.ts
CREATE TABLE guest_preference_catalog_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category   text NOT NULL CHECK (category IN ('DIETARY', 'ROOM', 'ACCESSIBILITY', 'OTHER')),
  source     text   NOT NULL CHECK (source IN ('PREDEFINED', 'CUSTOM')),
  key        text,                      -- set when source = PREDEFINED
  label      text,                      -- set when source = CUSTOM
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((source = 'PREDEFINED' AND key IS NOT NULL)
      OR (source = 'CUSTOM'     AND label IS NOT NULL)),
  UNIQUE (tenant_id, category, key),
  CONSTRAINT key_values CHECK (key IS NULL OR key IN (
    'VEGAN', 'VEGETARIAN', 'GLUTEN_FREE', 'LOW_SUGAR', 'NUT_ALLERGY', 'LACTOSE_FREE',
    'HALAL', 'KOSHER', 'HIGH_FLOOR', 'LOW_FLOOR', 'QUIET_ROOM', 'SMOKING',
    'NON_SMOKING', 'EXTRA_PILLOWS', 'FOAM_PILLOW', 'FEATHER_PILLOW', 'EXTRA_BLANKET',
    'HANDICAP_ACCESSIBLE', 'WHEELCHAIR_ACCESSIBLE', 'ROLL_IN_SHOWER', 'GRAB_BARS',
    'VISUAL_ALERTS'
  ))
);
CREATE INDEX ON guest_preference_catalog_items (tenant_id);

-- src/domain/guest-note/entities/guest-note.entity.ts
CREATE TABLE guest_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  guest_id   uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  note       text NOT NULL,
  type       text   NOT NULL DEFAULT 'general' CHECK (type IN ('preference', 'behavior', 'incident', 'general')),
  status     text NOT NULL DEFAULT 'not_pinned' CHECK (status IN ('is_pinned', 'not_pinned')),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX ON guest_notes (guest_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- MESSAGING
-- ============================================================================

-- src/domain/conversation/entities/conversation.entity.ts
CREATE TABLE conversations (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  guest_id               uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  reservation_id         uuid,  -- FK added after reservations exists
  channels               text[] NOT NULL DEFAULT '{}',
  subject                text NOT NULL,
  last_message_at        timestamptz NOT NULL DEFAULT now(),
  last_message_preview   text NOT NULL DEFAULT '',
  unread_count_for_staff integer NOT NULL DEFAULT 0 CHECK (unread_count_for_staff >= 0),
  unread_count_for_guest integer NOT NULL DEFAULT 0 CHECK (unread_count_for_guest >= 0),
  status                 text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'archived', 'snoozed')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT channels_values CHECK (channels <@ ARRAY[
    'email'
  ]::text[])
);
CREATE INDEX ON conversations (tenant_id, status, last_message_at DESC);
CREATE INDEX ON conversations (guest_id);

-- src/domain/guest-message/entities/guest-message.entity.ts
CREATE TABLE guest_messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  guest_id            uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  conversation_id     uuid REFERENCES conversations(id) ON DELETE SET NULL,
  reservation_id      uuid,  -- FK added after reservations exists
  channel             text   NOT NULL CHECK (channel IN ('email')),
  direction           text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status              text    NOT NULL CHECK (status IN ('queued', 'pending', 'sent', 'delivered', 'read', 'failed', 'bounced')),
  from_address        text   NOT NULL,
  to_addresses        text[] NOT NULL CHECK (cardinality(to_addresses) > 0),
  provider            text,
  provider_message_id text,
  template_id         text,
  sent_by_actor_id    uuid,          -- GuestMessageSentBy VO
  sent_by_actor_email citext,
  attachments         jsonb NOT NULL DEFAULT '[]',  -- { url, name, type? }[]
  preview             text NOT NULL,
  body                text,
  body_html           text,
  failure_reason      text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);
CREATE INDEX ON guest_messages (conversation_id, created_at);
CREATE INDEX ON guest_messages (tenant_id, guest_id, created_at DESC);
-- inbound webhooks are matched back by provider id
CREATE UNIQUE INDEX ON guest_messages (provider, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

-- src/domain/guest-email/entities/guest-email.entity.ts
CREATE TABLE guest_emails (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  guest_id    uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  subject     text NOT NULL,
  status      text NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  attachments jsonb NOT NULL DEFAULT '[]',
  message_id  text,
  sent_by_id  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON guest_emails (tenant_id, guest_id, created_at DESC);

-- ============================================================================
-- RESERVATIONS
-- ============================================================================

-- src/domain/reservation/entities/reservation.entity.ts
CREATE TABLE reservations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id             uuid NOT NULL,
  unit_id                 uuid NOT NULL,
  guest_id                uuid NOT NULL,
  check_in                date NOT NULL,                 -- DateRange VO
  check_out               date NOT NULL,
  source                  text NOT NULL CHECK (source IN ('MANUAL', 'DIRECT')),
  status                  text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW')),
  guests_count            integer NOT NULL CHECK (guests_count > 0),
  price_per_night         numeric(14,2) NOT NULL CHECK (price_per_night >= 0),
  total_price             numeric(14,2) NOT NULL CHECK (total_price >= 0),
  notes                   text,
  -- customer-visible per-tenant number (mongo kept a 'counters' collection for this).
  -- ponytail: no counter table - reservations are never deleted, so
  --   coalesce(max(reservation_number), 0) + 1 over the tenant's rows is the same
  --   number, and UNIQUE (tenant_id, reservation_number) below makes a concurrent
  --   double-insert fail with 23505 instead of colliding; retry the insert.
  --   Add a counter table if two rows ever race often enough for retries to hurt.
  reservation_number      bigint,
  check_in_info           jsonb NOT NULL DEFAULT '[]',   -- TravelerInfo[]
  -- the booking's id on the OTA it came from; the dedup key for imports
  external_reservation_id text,
  cancelled_at            timestamptz,
  cancellation_reason     text,
  check_in_actual_at      timestamptz,
  check_out_actual_at     timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out > check_in),
  UNIQUE (tenant_id, reservation_number),
  -- one 3-column FK covers all three lies a request body could tell: wrong tenant,
  -- wrong property for the unit, unit borrowed from another tenant.
  FOREIGN KEY (tenant_id, property_id, unit_id) REFERENCES units (tenant_id, property_id, id),
  FOREIGN KEY (tenant_id, guest_id) REFERENCES guests (tenant_id, id)
);
-- partial, like the mongo index it replaces: only imported reservations carry one,
-- and two OTAs may legitimately reuse an id, so source is part of the key
CREATE UNIQUE INDEX ON reservations (external_reservation_id, source)
  WHERE external_reservation_id IS NOT NULL;
CREATE INDEX ON reservations (tenant_id, status);
CREATE INDEX ON reservations (guest_id);
-- availability-checker.domain-service: overlap lookups on a unit's date window
CREATE INDEX ON reservations (unit_id, check_in, check_out)
  WHERE status <> 'CANCELLED';

ALTER TABLE conversations  ADD FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL;
ALTER TABLE guest_messages ADD FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL;

-- src/domain/unit-rating/entities/unit-rating.entity.ts
CREATE TABLE unit_ratings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id        uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  guest_id       uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  rate           smallint NOT NULL CHECK (rate BETWEEN 1 AND 5),
  message        text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
);
-- one rating per reservation
CREATE UNIQUE INDEX ON unit_ratings (reservation_id) WHERE deleted_at IS NULL;
CREATE INDEX ON unit_ratings (unit_id) WHERE deleted_at IS NULL;

-- src/domain/refund/entities/refund-request.entity.ts
CREATE TABLE refund_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  guest_id       uuid NOT NULL REFERENCES guests(id),
  amount         numeric(14,2) NOT NULL CHECK (amount >= 0),
  status         text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DENIED')),
  -- who asked, as an actor kind ('guest'), not a user id: RefundRequest.create
  -- hardcodes it and no users row corresponds
  requested_by   text NOT NULL,
  reviewed_by    uuid REFERENCES users(id),
  reviewed_at    timestamptz,
  reason         text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'PENDING') = (reviewed_at IS NULL))
);
CREATE INDEX ON refund_requests (tenant_id, status);

-- ============================================================================
-- EXPERIENCES / CART / PAYMENTS
-- ============================================================================

-- src/domain/experience/entities/experience.entity.ts
CREATE TABLE experiences (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scope                      text NOT NULL CHECK (scope IN ('GLOBAL', 'PROPERTY')),
  property_id                uuid REFERENCES properties(id) ON DELETE CASCADE,
  name                       text NOT NULL,
  description                text NOT NULL,
  city                       text NOT NULL,
  category                   text NOT NULL CHECK (category IN ('TRANSPORTATION')),
  price_cop                  bigint NOT NULL CHECK (price_cop >= 0),
  minimum_participants       integer NOT NULL DEFAULT 1 CHECK (minimum_participants > 0),
  capacity                   integer NOT NULL CHECK (capacity > 0),
  availability_type          text NOT NULL CHECK (availability_type IN ('RECURRING')),
  recurrence                 jsonb,  -- { daysOfWeek:int[], startTime, endTime }
  allow_standalone_purchase  boolean NOT NULL DEFAULT true,
  allow_reservation_purchase boolean NOT NULL DEFAULT true,
  min_notice_hours           integer NOT NULL DEFAULT 0 CHECK (min_notice_hours >= 0),
  purchase_cutoff_hours      integer NOT NULL DEFAULT 0 CHECK (purchase_cutoff_hours >= 0),
  media_keys                 text[] NOT NULL DEFAULT '{}',
  status                     text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  deleted_at                 timestamptz,
  CHECK (minimum_participants <= capacity),
  CHECK ((scope = 'PROPERTY') = (property_id IS NOT NULL))
);
CREATE INDEX ON experiences (tenant_id, status) WHERE deleted_at IS NULL;

-- src/domain/cart/entities/cart.entity.ts
-- experience_items / reservation_item are CartItem + CartReservationItem VOs (price snapshots).
-- ponytail: jsonb — the cart is short-lived and always read whole. Promote to a
-- cart_items table only if you start querying across carts by experience.
CREATE TABLE carts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_account_id uuid NOT NULL REFERENCES guest_accounts(id) ON DELETE CASCADE,
  experience_items jsonb NOT NULL DEFAULT '[]',
  reservation_item jsonb,
  status           text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PENDING_PAYMENT', 'PAID', 'EXPIRED')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
-- one open cart per guest account
CREATE UNIQUE INDEX ON carts (guest_account_id) WHERE status = 'OPEN';

-- src/domain/experience-purchase/entities/experience-purchase.entity.ts
CREATE TABLE experience_purchases (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  guest_account_id  uuid NOT NULL REFERENCES guest_accounts(id),
  experience_id     uuid NOT NULL REFERENCES experiences(id),
  reservation_id    uuid REFERENCES reservations(id) ON DELETE SET NULL,
  selected_date     date,
  quantity          integer NOT NULL CHECK (quantity > 0),
  unit_price_cop    bigint  NOT NULL CHECK (unit_price_cop >= 0),
  total_price_cop   bigint  NOT NULL CHECK (total_price_cop >= 0),
  status            text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED')),
  payment_reference text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
-- experience-capacity-checker.domain-service: seats taken per experience/day
CREATE INDEX ON experience_purchases (experience_id, selected_date)
  WHERE status <> 'CANCELLED';
CREATE INDEX ON experience_purchases (guest_account_id);

-- src/domain/payment/entities/payment-session.entity.ts
CREATE TABLE payment_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  guest_account_id    uuid NOT NULL REFERENCES guest_accounts(id),
  cart_id             uuid NOT NULL REFERENCES carts(id),
  reference           text NOT NULL UNIQUE,
  amount_in_cents     bigint NOT NULL CHECK (amount_in_cents > 0),
  currency            char(3) NOT NULL DEFAULT 'COP' CHECK (currency = 'COP'),
  public_key          text NOT NULL,
  signature_integrity text NOT NULL,
  redirect_url        text,
  expiration_time     timestamptz,
  provider_reference  text,
  status              text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED', 'EXPIRED', 'CANCELLED')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON payment_sessions (cart_id);
CREATE UNIQUE INDEX ON payment_sessions (provider_reference)
  WHERE provider_reference IS NOT NULL;

-- ============================================================================
-- OPERATIONS
-- ============================================================================

-- src/domain/shift/entities/shift.entity.ts
CREATE TABLE shifts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id     uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name            text NOT NULL,
  start_date      date NOT NULL,
  end_date        date,
  start_hour      time NOT NULL,           -- ShiftHour VO
  end_hour        time NOT NULL,
  start_minutes   integer NOT NULL CHECK (start_minutes BETWEEN 0 AND 1439),
  end_minutes     integer NOT NULL CHECK (end_minutes   BETWEEN 0 AND 1439),
  weekdays        smallint[],              -- 0..6, null = every day
  notes           text,
  created_by      uuid REFERENCES users(id),
  created_by_email citext,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX ON shifts (tenant_id, property_id, start_date);

-- Shift.staffMemberIds: UserId[]
CREATE TABLE shift_staff_members (
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (shift_id, user_id)
);
CREATE INDEX ON shift_staff_members (user_id);

-- src/domain/incident-report/entities/incident-report.entity.ts
CREATE TABLE incident_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id     uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_by      uuid NOT NULL REFERENCES users(id),
  title           text NOT NULL,
  description     text NOT NULL,
  attachment_urls text[] NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
CREATE INDEX ON incident_reports (property_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- INVENTORY
-- ============================================================================

-- src/domain/inventory/entities/supplier.entity.ts
CREATE TABLE suppliers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          text   NOT NULL,
  contact_email citext NOT NULL,
  contact_phone text   NOT NULL,
  country       text   NOT NULL,
  city          text   NOT NULL,
  nit           text   NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);
CREATE UNIQUE INDEX ON suppliers (tenant_id, nit) WHERE deleted_at IS NULL;

-- src/domain/inventory/entities/inventory-item-category.entity.ts
CREATE TABLE inventory_item_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

-- src/domain/inventory/entities/inventory-item.entity.ts
CREATE TABLE inventory_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id   uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  sku           text NOT NULL,
  name          text NOT NULL,
  category_id   uuid NOT NULL REFERENCES inventory_item_categories(id),
  unit          text NOT NULL,                        -- unit of measure (kg, box, ...)
  min_stock     numeric(14,3) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  current_stock numeric(14,3) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  supplier_id   uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);
-- partial so a soft-deleted item does not hold its SKU hostage
CREATE UNIQUE INDEX ON inventory_items (tenant_id, property_id, sku)
  WHERE deleted_at IS NULL;
CREATE INDEX ON inventory_items (property_id);
-- low-stock-alert.event feeds off this
CREATE INDEX ON inventory_items (tenant_id)
  WHERE current_stock <= min_stock AND deleted_at IS NULL;

-- src/domain/inventory/entities/inventory-movement.entity.ts  (append-only ledger)
CREATE TABLE inventory_movements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  item_id     uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT')),
  quantity    numeric(14,3) NOT NULL CHECK (quantity > 0),
  reason      text NOT NULL,
  reference   text,
  actor_id    uuid   NOT NULL,
  actor_email citext NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON inventory_movements (item_id, created_at DESC);

-- ============================================================================
-- AUDIT
-- ============================================================================

-- src/domain/audit/entities/audit-log.entity.ts  (append-only)
CREATE TABLE audit_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id        uuid   NOT NULL,
  user_email     citext NOT NULL,
  -- AuditAction enum, src/domain/audit/value-objects/audit-action.vo.ts
  -- ponytail: no CHECK — append-only, written only by the audit service; the list
  -- grows with every feature and the DB gains nothing by re-stating it.
  action         text      NOT NULL,
  entity_type    text NOT NULL,
  entity_id      uuid,
  metadata       jsonb,
  previous_value jsonb,
  new_value      jsonb,
  ip_address     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entity_type_values CHECK (entity_type IN (
    'AUTH', 'TENANT', 'USER', 'PROPERTY', 'UNIT', 'INCIDENT_REPORT', 'RESERVATION', 'SHIFT',
    'SUPPLIER', 'EXPERIENCE', 'EXPERIENCE_PURCHASE', 'CART', 'UNIT_RATING', 'GUEST_NOTE',
    'GUEST', 'GUEST_EMAIL', 'GUEST_CATALOG_ITEM'
  ))
);
CREATE INDEX ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX ON audit_logs (entity_type, entity_id);

