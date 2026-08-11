-- CreateEnum
CREATE TYPE "GeoSource" AS ENUM ('GAZETTEER', 'NOMINATIM', 'MANUAL');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "locationId" TEXT;

-- CreateTable
CREATE TABLE "GeoLocation" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "source" "GeoSource" NOT NULL DEFAULT 'GAZETTEER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeoLocation_slug_key" ON "GeoLocation"("slug");

-- CreateIndex
CREATE INDEX "GeoLocation_country_idx" ON "GeoLocation"("country");

-- CreateIndex
CREATE INDEX "Profile_locationId_idx" ON "Profile"("locationId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "GeoLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
