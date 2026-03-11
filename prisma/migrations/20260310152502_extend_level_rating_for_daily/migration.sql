/*
  Warnings:

  - A unique constraint covering the columns `[userId,levelId]` on the table `LevelRating` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,dailyChallengeId]` on the table `LevelRating` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "LevelRating" DROP CONSTRAINT "LevelRating_levelId_fkey";

-- AlterTable
ALTER TABLE "LevelRating" ADD COLUMN     "dailyChallengeId" TEXT,
ALTER COLUMN "levelId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LevelRating_userId_levelId_key" ON "LevelRating"("userId", "levelId");

-- CreateIndex
CREATE UNIQUE INDEX "LevelRating_userId_dailyChallengeId_key" ON "LevelRating"("userId", "dailyChallengeId");

-- AddForeignKey
ALTER TABLE "LevelRating" ADD CONSTRAINT "LevelRating_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelRating" ADD CONSTRAINT "LevelRating_dailyChallengeId_fkey" FOREIGN KEY ("dailyChallengeId") REFERENCES "DailyChallenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
