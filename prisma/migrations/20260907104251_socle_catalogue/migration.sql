-- CreateEnum
CREATE TYPE "Confiance" AS ENUM ('STUDIO', 'RECOUPE', 'UNIQUE', 'AUCUNE');

-- CreateEnum
CREATE TYPE "Volatilite" AS ENUM ('BASSE', 'MOYENNE', 'HAUTE', 'TRES_HAUTE');

-- CreateTable
CREATE TABLE "studios" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "siteUrl" TEXT,
    "ou_sourcer" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maj_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jeux" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "studio_id" UUID NOT NULL,
    "rtp_studio" DECIMAL(5,2),
    "rtp_paliers" DECIMAL(5,2)[],
    "rtp_achat_bonus" DECIMAL(5,2),
    "rtp_source" TEXT,
    "rtp_confiance" "Confiance" NOT NULL DEFAULT 'AUCUNE',
    "rtp_verifie_le" TIMESTAMP(3),
    "volatilite" "Volatilite",
    "gain_max_multiple" INTEGER,
    "rouleaux" INTEGER,
    "lignes" INTEGER,
    "mecaniques" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "achat_bonus" BOOLEAN,
    "sortie_le" TIMESTAMP(3),
    "demo_url" TEXT,
    "visuel_url" TEXT,
    "confiance" "Confiance" NOT NULL DEFAULT 'AUCUNE',
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maj_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jeux_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traductions" (
    "id" UUID NOT NULL,
    "jeu_id" UUID NOT NULL,
    "langue" VARCHAR(5) NOT NULL,
    "titre" TEXT,
    "chapo" TEXT,
    "presentation" TEXT,
    "points" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maj_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "traductions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "studios_slug_key" ON "studios"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "jeux_slug_key" ON "jeux"("slug");

-- CreateIndex
CREATE INDEX "jeux_studio_id_idx" ON "jeux"("studio_id");

-- CreateIndex
CREATE INDEX "jeux_sortie_le_idx" ON "jeux"("sortie_le");

-- CreateIndex
CREATE UNIQUE INDEX "traductions_jeu_id_langue_key" ON "traductions"("jeu_id", "langue");

-- AddForeignKey
ALTER TABLE "jeux" ADD CONSTRAINT "jeux_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traductions" ADD CONSTRAINT "traductions_jeu_id_fkey" FOREIGN KEY ("jeu_id") REFERENCES "jeux"("id") ON DELETE CASCADE ON UPDATE CASCADE;
