-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_image" BYTEA,
ADD COLUMN     "avatar_image_type" TEXT,
ADD COLUMN     "avatar_preset" TEXT,
ADD COLUMN     "avatar_updated_at" TIMESTAMP(3);
