-- Shared-unit logic is discontinued; drop the now-unused column.
ALTER TABLE "units" DROP COLUMN "is_shared";
