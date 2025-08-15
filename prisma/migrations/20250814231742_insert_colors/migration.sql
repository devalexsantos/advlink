-- AlterTable
ALTER TABLE "public"."Profile" ADD COLUMN     "primaryColor" TEXT NOT NULL DEFAULT '#8B0000',
ADD COLUMN     "secondaryColor" TEXT NOT NULL DEFAULT '#000000',
ADD COLUMN     "textColor" TEXT NOT NULL DEFAULT '#FFFFFF';
