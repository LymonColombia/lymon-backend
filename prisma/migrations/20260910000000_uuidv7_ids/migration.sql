-- New ids are uuidv7 (built in since PG18): time-ordered, so inserts append to the
-- right edge of each primary-key index instead of landing on random pages.
-- Existing v4 ids stay as they are; both versions share the uuid type.
ALTER TABLE tenants ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE roles ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE users ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE user_role_assignments ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE properties ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE units ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE guest_accounts ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE guests ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE guest_tags ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE guest_preference_catalog_items ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE guest_notes ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE conversations ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE guest_messages ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE guest_emails ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE reservations ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE unit_ratings ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE refund_requests ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE experiences ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE carts ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE experience_purchases ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE payment_sessions ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE shifts ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE incident_reports ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE suppliers ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE inventory_item_categories ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE inventory_items ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE inventory_movements ALTER COLUMN id SET DEFAULT uuidv7();
ALTER TABLE audit_logs ALTER COLUMN id SET DEFAULT uuidv7();
