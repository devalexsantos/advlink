-- Add position column to ActivityAreas and backfill values based on createdAt per user

ALTER TABLE "ActivityAreas" ADD COLUMN "position" INTEGER;

UPDATE "ActivityAreas" AS a
SET "position" = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt" ASC, id ASC) AS rn
  FROM "ActivityAreas"
) AS sub
WHERE a.id = sub.id;

ALTER TABLE "ActivityAreas" ALTER COLUMN "position" SET NOT NULL;

-- Helpful index for ordering within user
CREATE INDEX IF NOT EXISTS "ActivityAreas_userId_position_idx" ON "ActivityAreas"("userId", "position");


