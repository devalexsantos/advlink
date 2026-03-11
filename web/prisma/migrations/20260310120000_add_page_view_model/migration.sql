-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "path" TEXT NOT NULL DEFAULT '/',
    "referrer" TEXT,
    "user_agent" TEXT,
    "country" TEXT,
    "city" TEXT,
    "region" TEXT,
    "device_type" TEXT,
    "browser" TEXT,
    "visitor_hash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageView_profileId_createdAt_idx" ON "PageView"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_profileId_visitor_hash_createdAt_idx" ON "PageView"("profileId", "visitor_hash", "createdAt");

-- AddForeignKey
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
