-- Phase 1: Add new columns to Profile
ALTER TABLE "Profile" ADD COLUMN "name" TEXT;
ALTER TABLE "Profile" ADD COLUMN "setupComplete" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN "stripeSubscriptionId" TEXT;

-- Phase 1b: Add profileId columns to child entities
ALTER TABLE "ActivityAreas" ADD COLUMN "profileId" TEXT;
ALTER TABLE "Links" ADD COLUMN "profileId" TEXT;
ALTER TABLE "Gallery" ADD COLUMN "profileId" TEXT;
ALTER TABLE "Address" ADD COLUMN "profileId" TEXT;
ALTER TABLE "CustomSection" ADD COLUMN "profileId" TEXT;

-- Phase 2: Populate profileId from userId via Profile lookup
UPDATE "ActivityAreas" a SET "profileId" = p.id FROM "Profile" p WHERE p."userId" = a."userId";
UPDATE "Links" l SET "profileId" = p.id FROM "Profile" p WHERE p."userId" = l."userId";
UPDATE "Gallery" g SET "profileId" = p.id FROM "Profile" p WHERE p."userId" = g."userId";
UPDATE "Address" a SET "profileId" = p.id FROM "Profile" p WHERE p."userId" = a."userId";
UPDATE "CustomSection" cs SET "profileId" = p.id FROM "Profile" p WHERE p."userId" = cs."userId";

-- Phase 3: Migrate existing user data to Profile
UPDATE "Profile" SET "name" = "publicName" WHERE "name" IS NULL;
UPDATE "Profile" p SET "isActive" = u."isActive" FROM "User" u WHERE u.id = p."userId";
UPDATE "Profile" p SET "setupComplete" = true FROM "User" u WHERE u.id = p."userId" AND u."completed_onboarding" = true;

-- Phase 4: User.isActive becomes admin flag (default true)
ALTER TABLE "User" ALTER COLUMN "isActive" SET DEFAULT true;
UPDATE "User" SET "isActive" = true;

-- Phase 5: Make profileId NOT NULL on child entities
ALTER TABLE "ActivityAreas" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "Links" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "Gallery" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "CustomSection" ALTER COLUMN "profileId" SET NOT NULL;

-- Phase 6: Drop old foreign keys and userId columns
ALTER TABLE "ActivityAreas" DROP CONSTRAINT "ActivityAreas_userId_fkey";
ALTER TABLE "Links" DROP CONSTRAINT "Links_userId_fkey";
ALTER TABLE "Gallery" DROP CONSTRAINT "Gallery_userId_fkey";
ALTER TABLE "Address" DROP CONSTRAINT "Address_userId_fkey";
ALTER TABLE "CustomSection" DROP CONSTRAINT "CustomSection_userId_fkey";

DROP INDEX IF EXISTS "ActivityAreas_userId_position_idx";
DROP INDEX IF EXISTS "CustomSection_userId_position_idx";

ALTER TABLE "ActivityAreas" DROP COLUMN "userId";
ALTER TABLE "Links" DROP COLUMN "userId";
ALTER TABLE "Gallery" DROP COLUMN "userId";
ALTER TABLE "CustomSection" DROP COLUMN "userId";

DROP INDEX IF EXISTS "Address_userId_key";
ALTER TABLE "Address" DROP COLUMN "userId";
CREATE UNIQUE INDEX "Address_profileId_key" ON "Address"("profileId");

-- Phase 7: Remove unique from Profile.userId (allow 1:N)
DROP INDEX IF EXISTS "Profile_userId_key";

-- Phase 8: Add new foreign keys and indexes
ALTER TABLE "ActivityAreas" ADD CONSTRAINT "ActivityAreas_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Links" ADD CONSTRAINT "Links_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Gallery" ADD CONSTRAINT "Gallery_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Address" ADD CONSTRAINT "Address_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomSection" ADD CONSTRAINT "CustomSection_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ActivityAreas_profileId_position_idx" ON "ActivityAreas"("profileId", "position");
CREATE INDEX "CustomSection_profileId_position_idx" ON "CustomSection"("profileId", "position");
CREATE INDEX "Profile_userId_idx" ON "Profile"("userId");
