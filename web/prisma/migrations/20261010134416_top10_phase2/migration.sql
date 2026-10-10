-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "firstPublishedAt" TIMESTAMP(3),
ADD COLUMN     "oabNumber" TEXT,
ADD COLUMN     "oabState" TEXT,
ADD COLUMN     "practiceType" TEXT;

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "oabNumber" TEXT,
ADD COLUMN     "oabState" TEXT;

-- CreateTable
CREATE TABLE "PreviewLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreviewLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreviewLink_token_key" ON "PreviewLink"("token");

-- CreateIndex
CREATE INDEX "PreviewLink_profileId_idx" ON "PreviewLink"("profileId");

-- AddForeignKey
ALTER TABLE "PreviewLink" ADD CONSTRAINT "PreviewLink_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: sites already published are treated as first published at their last update
UPDATE "Profile" SET "firstPublishedAt" = "updatedAt" WHERE "isActive" = true AND "firstPublishedAt" IS NULL;
