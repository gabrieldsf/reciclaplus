-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "photo_id" UUID;

-- AlterTable
ALTER TABLE "occurrences" ADD COLUMN     "photo_id" UUID;

-- CreateTable
CREATE TABLE "photos" (
    "id" UUID NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "data" BYTEA NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "photos_uploaded_by_created_at_idx" ON "photos"("uploaded_by", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "collections_photo_id_key" ON "collections"("photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "occurrences_photo_id_key" ON "occurrences"("photo_id");

-- AddForeignKey
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

