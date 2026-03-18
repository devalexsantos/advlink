-- Delete orphan addresses (profileId IS NULL) before making column required
DELETE FROM "Address" WHERE "profileId" IS NULL;

-- AlterTable: make profileId required
ALTER TABLE "Address" ALTER COLUMN "profileId" SET NOT NULL;
