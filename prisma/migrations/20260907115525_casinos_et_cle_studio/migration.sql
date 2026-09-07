-- AlterTable
ALTER TABLE "studios" ADD COLUMN     "cle_casino" TEXT;

-- CreateTable
CREATE TABLE "casinos" (
    "id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "logo" TEXT,
    "providers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "playUrl" TEXT NOT NULL,
    "pays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" DECIMAL(3,1),
    "bonus_texte" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maj_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "casinos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "casinos_slug_key" ON "casinos"("slug");
