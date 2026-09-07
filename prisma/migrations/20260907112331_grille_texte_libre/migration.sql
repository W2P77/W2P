/*
  Warnings:

  - You are about to drop the column `lignes` on the `jeux` table. All the data in the column will be lost.
  - You are about to drop the column `rouleaux` on the `jeux` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "jeux" DROP COLUMN "lignes",
DROP COLUMN "rouleaux",
ADD COLUMN     "grille" TEXT,
ADD COLUMN     "lignes_paiement" TEXT;
