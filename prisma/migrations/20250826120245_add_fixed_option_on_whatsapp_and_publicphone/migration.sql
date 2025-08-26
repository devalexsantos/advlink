-- AlterTable
ALTER TABLE "public"."Profile" ADD COLUMN     "publicPhoneIsFixed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappIsFixed" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "theme" SET DEFAULT 'classic';
