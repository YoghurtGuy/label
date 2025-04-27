-- CreateEnum
CREATE TYPE "DatasetType" AS ENUM ('OBJECT_DETECTION', 'OCR');

-- AlterTable
ALTER TABLE "Dataset" ADD COLUMN     "type" "DatasetType" NOT NULL DEFAULT 'OBJECT_DETECTION';
