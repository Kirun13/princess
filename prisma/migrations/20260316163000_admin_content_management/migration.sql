-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "LevelStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "Level"
ADD COLUMN "createdById" TEXT,
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "status" "LevelStatus" NOT NULL DEFAULT 'PUBLISHED';

-- Backfill sort order from current level number
UPDATE "Level"
SET "sortOrder" = "number"
WHERE "sortOrder" = 0;

-- CreateIndex
CREATE INDEX "Level_status_deletedAt_sortOrder_idx" ON "Level"("status", "deletedAt", "sortOrder");

-- CreateIndex
CREATE INDEX "Level_createdById_idx" ON "Level"("createdById");

-- AddForeignKey
ALTER TABLE "Level"
ADD CONSTRAINT "Level_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
