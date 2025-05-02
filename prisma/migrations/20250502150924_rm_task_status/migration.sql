/*
  Warnings:

  - You are about to drop the column `taskId` on the `Annotation` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `AnnotationTask` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Annotation" DROP CONSTRAINT "Annotation_taskId_fkey";

-- DropIndex
DROP INDEX "AnnotationTask_status_idx";

-- AlterTable
ALTER TABLE "Annotation" DROP COLUMN "taskId";

-- AlterTable
ALTER TABLE "AnnotationTask" DROP COLUMN "status";

-- DropEnum
DROP TYPE "TaskStatus";

-- CreateIndex
CREATE INDEX "AnnotationTask_datasetId_idx" ON "AnnotationTask"("datasetId");
