-- DeleteDuplicates (keep only the most recent Address per user)
DELETE FROM "Address" a
USING "Address" b
WHERE a."userId" = b."userId"
  AND a."id" < b."id";

-- CreateIndex
CREATE UNIQUE INDEX "Address_userId_key" ON "Address"("userId");
