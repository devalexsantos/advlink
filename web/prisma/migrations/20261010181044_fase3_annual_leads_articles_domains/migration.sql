-- AlterTable
ALTER TABLE "BillingPayment" ADD COLUMN     "cycle" TEXT NOT NULL DEFAULT 'MONTHLY';

-- AlterTable
ALTER TABLE "BillingPaymentLink" ADD COLUMN     "cycle" TEXT NOT NULL DEFAULT 'MONTHLY';

-- AlterTable
ALTER TABLE "BillingSubscription" ADD COLUMN     "cycle" TEXT NOT NULL DEFAULT 'MONTHLY';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "leadFormEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "areaTitle" TEXT,
    "message" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomDomain" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_dns',
    "verifyToken" TEXT NOT NULL,
    "easypanelDomainId" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomDomain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_profileId_createdAt_idx" ON "Lead"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Article_profileId_status_publishedAt_idx" ON "Article"("profileId", "status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Article_profileId_slug_key" ON "Article"("profileId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "CustomDomain_profileId_key" ON "CustomDomain"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomDomain_host_key" ON "CustomDomain"("host");

-- CreateIndex
CREATE INDEX "CustomDomain_status_idx" ON "CustomDomain"("status");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomDomain" ADD CONSTRAINT "CustomDomain_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
