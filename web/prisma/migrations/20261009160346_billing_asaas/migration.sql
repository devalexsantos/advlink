-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('NONE', 'PENDING', 'ACTIVE', 'GRACE', 'SUSPENDED', 'CANCELED');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "billingStatus" "BillingStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "churnedAt" TIMESTAMP(3),
ADD COLUMN     "graceUntil" DATE,
ADD COLUMN     "paidUntil" DATE,
ADD COLUMN     "suspendedByAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BillingPaymentLink" (
    "id" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "asaasId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "billingType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "BillingPaymentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingSubscription" (
    "id" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "asaasId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "asaasCustomerId" TEXT NOT NULL,
    "billingType" TEXT,
    "valueCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "nextDueDate" TEXT,
    "cancelReason" TEXT,
    "canceledAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingPayment" (
    "id" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "asaasId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "subscriptionAsaasId" TEXT,
    "billingType" TEXT NOT NULL,
    "valueCents" INTEGER NOT NULL,
    "netValueCents" INTEGER,
    "status" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "paymentDate" TEXT,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "invoiceUrl" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'ASAAS',
    "environment" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "result" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillingPaymentLink_profileId_status_idx" ON "BillingPaymentLink"("profileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BillingPaymentLink_environment_asaasId_key" ON "BillingPaymentLink"("environment", "asaasId");

-- CreateIndex
CREATE INDEX "BillingSubscription_profileId_status_idx" ON "BillingSubscription"("profileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BillingSubscription_environment_asaasId_key" ON "BillingSubscription"("environment", "asaasId");

-- CreateIndex
CREATE INDEX "BillingPayment_profileId_dueDate_idx" ON "BillingPayment"("profileId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "BillingPayment_environment_asaasId_key" ON "BillingPayment"("environment", "asaasId");

-- CreateIndex
CREATE INDEX "WebhookEvent_processedAt_idx" ON "WebhookEvent"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_environment_eventId_key" ON "WebhookEvent"("provider", "environment", "eventId");

-- CreateIndex
CREATE INDEX "Profile_billingStatus_idx" ON "Profile"("billingStatus");

-- AddForeignKey
ALTER TABLE "BillingPaymentLink" ADD CONSTRAINT "BillingPaymentLink_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingSubscription" ADD CONSTRAINT "BillingSubscription_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
