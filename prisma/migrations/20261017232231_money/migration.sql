-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "value" INTEGER,
ADD COLUMN     "wonAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "fee" INTEGER;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'USD';

-- Amounts are minor units between 0 and 10,000,000.00: the app checks this
-- too, and the database refuses anything else.
ALTER TABLE "leads" ADD CONSTRAINT "leads_value_range"
  CHECK ("value" IS NULL OR "value" BETWEEN 0 AND 1000000000);
ALTER TABLE "projects" ADD CONSTRAINT "projects_fee_range"
  CHECK ("fee" IS NULL OR "fee" BETWEEN 0 AND 1000000000);

-- Existing data: workspaces in Morocco count in dirhams (the same guess the
-- app makes for new ones), and leads already won were won when converted,
-- or else at their last change.
UPDATE "workspaces" SET "currency" = 'MAD'
  WHERE "timezone" IN ('Africa/Casablanca', 'Africa/El_Aaiun');
UPDATE "leads" SET "wonAt" = COALESCE("convertedAt", "updatedAt")
  WHERE "status" = 'WON';
