/*
  Warnings:

  - You are about to drop the column `stripeSubscriptionId` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "stripeSubscriptionId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "stripeCustomerId";
