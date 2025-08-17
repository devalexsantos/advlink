/*
  Warnings:

  - You are about to drop the column `completed_onboarding` on the `Account` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Account" DROP COLUMN "completed_onboarding";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "completed_onboarding" BOOLEAN NOT NULL DEFAULT false;
