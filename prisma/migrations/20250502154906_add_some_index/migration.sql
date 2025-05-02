-- DropIndex
DROP INDEX "Annotation_type_idx";

-- DropIndex
DROP INDEX "Label_name_idx";

-- CreateIndex
CREATE INDEX "Annotation_imageId_idx" ON "Annotation"("imageId");

-- CreateIndex
CREATE INDEX "Image_datasetId_idx" ON "Image"("datasetId");

-- CreateIndex
CREATE INDEX "Label_datasetId_idx" ON "Label"("datasetId");
