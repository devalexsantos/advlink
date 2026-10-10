-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "firmCnpj" TEXT,
ADD COLUMN     "firmName" TEXT,
ADD COLUMN     "firmOabRegistration" TEXT,
ADD COLUMN     "firmType" TEXT,
ADD COLUMN     "languages" TEXT,
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "officeHours" TEXT,
ADD COLUMN     "onlineService" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappMessage" TEXT,
ADD COLUMN     "youtubeUrl" TEXT;

-- CreateTable
CREATE TABLE "ActivityAreaFaq" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityAreaFaq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityAreaFaq_areaId_position_idx" ON "ActivityAreaFaq"("areaId", "position");

-- AddForeignKey
ALTER TABLE "ActivityAreaFaq" ADD CONSTRAINT "ActivityAreaFaq_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "ActivityAreas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
