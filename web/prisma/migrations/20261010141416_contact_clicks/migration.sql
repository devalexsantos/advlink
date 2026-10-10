-- CreateTable
CREATE TABLE "ContactClick" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "visitor_hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactClick_profileId_createdAt_idx" ON "ContactClick"("profileId", "createdAt");

-- AddForeignKey
ALTER TABLE "ContactClick" ADD CONSTRAINT "ContactClick_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
