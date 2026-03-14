-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "sectionIcons" JSONB;

-- CreateTable
CREATE TABLE "CustomSection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "layout" TEXT NOT NULL,
    "iconName" TEXT NOT NULL DEFAULT 'FileText',
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomSection_userId_position_idx" ON "CustomSection"("userId", "position");

-- AddForeignKey
ALTER TABLE "CustomSection" ADD CONSTRAINT "CustomSection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
