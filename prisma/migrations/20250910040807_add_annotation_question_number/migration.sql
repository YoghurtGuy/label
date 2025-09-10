-- CreateEnum
CREATE TYPE "DatasetCategory" AS ENUM ('DEFAULT', 'MEDICAL', 'AUTOMOTIVE', 'RETAIL', 'AGRICULTURE', 'SECURITY', 'EDUCATION', 'FINANCE');

-- AlterTable
ALTER TABLE "Annotation" ADD COLUMN     "questionNumber" INTEGER;

-- AlterTable
ALTER TABLE "Dataset" ADD COLUMN     "category" "DatasetCategory" NOT NULL DEFAULT 'DEFAULT';
