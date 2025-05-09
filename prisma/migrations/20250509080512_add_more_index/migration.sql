-- DropIndex
DROP INDEX "Dataset_name_idx";

-- CreateIndex
CREATE INDEX "Annotation_createdById_idx" ON "Annotation"("createdById");

-- CreateIndex
CREATE INDEX "Dataset_createdAt_idx" ON "Dataset"("createdAt");

-- CreateIndex
CREATE INDEX "Dataset_id_idx" ON "Dataset"("id");

-- CreateIndex
CREATE INDEX "Image_id_idx" ON "Image"("id");
