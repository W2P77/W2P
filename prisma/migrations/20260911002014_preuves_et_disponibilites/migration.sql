-- CreateEnum
CREATE TYPE "TypeDeSource" AS ENUM ('REGLES_DU_JEU', 'STUDIO', 'DEMO_OFFICIELLE', 'OPERATEUR', 'RECOUPEE', 'TIERCE', 'INCONNUE');

-- CreateEnum
CREATE TYPE "PresenceJeu" AS ENUM ('CONFIRMEE', 'PROBABLE', 'ABSENTE', 'INCONNUE');

-- CreateTable
CREATE TABLE "preuves" (
    "id" UUID NOT NULL,
    "jeu_id" UUID NOT NULL,
    "champ" TEXT NOT NULL,
    "valeur_brute" TEXT NOT NULL,
    "type" "TypeDeSource" NOT NULL,
    "url" TEXT,
    "libelle" TEXT,
    "capture" TEXT,
    "reference" TEXT,
    "verifiee_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiee_par" TEXT NOT NULL,
    "note" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preuves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disponibilites_casino" (
    "id" UUID NOT NULL,
    "jeu_id" UUID NOT NULL,
    "casino_id" INTEGER NOT NULL,
    "presence" "PresenceJeu" NOT NULL DEFAULT 'INCONNUE',
    "jeu_exact_verifie" BOOLEAN NOT NULL DEFAULT false,
    "preuve_url" TEXT,
    "capture" TEXT,
    "verifiee_le" TIMESTAMP(3),
    "pays" TEXT,
    "note" TEXT,
    "cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maj_le" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disponibilites_casino_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "preuves_jeu_id_champ_idx" ON "preuves"("jeu_id", "champ");

-- CreateIndex
CREATE INDEX "disponibilites_casino_casino_id_presence_idx" ON "disponibilites_casino"("casino_id", "presence");

-- CreateIndex
CREATE UNIQUE INDEX "disponibilites_casino_jeu_id_casino_id_pays_key" ON "disponibilites_casino"("jeu_id", "casino_id", "pays");

-- AddForeignKey
ALTER TABLE "preuves" ADD CONSTRAINT "preuves_jeu_id_fkey" FOREIGN KEY ("jeu_id") REFERENCES "jeux"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilites_casino" ADD CONSTRAINT "disponibilites_casino_jeu_id_fkey" FOREIGN KEY ("jeu_id") REFERENCES "jeux"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilites_casino" ADD CONSTRAINT "disponibilites_casino_casino_id_fkey" FOREIGN KEY ("casino_id") REFERENCES "casinos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

