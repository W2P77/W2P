/**
 * Applique une table de traductions écrites à la main.
 *
 * ── Pourquoi une table plutôt qu'une règle ────────────────────────────────
 *
 * La traduction par vocabulaire a fait ce qu'elle savait faire — 3 594
 * chaînes — puis s'est mise à abîmer ce qu'elle touchait : « Multipliers
 * croissant with l'altitude », « Grid asymétrique 3-4-3 », « bet majorée
 * x2 ». Sur un site anglais, une phrase à moitié traduite se voit plus qu'une
 * phrase restée en français.
 *
 * Ce qui reste n'est plus du vocabulaire, ce sont des phrases rédigées. Elles
 * se traduisent une par une, et la table garde la trace de ce qui a été
 * décidé — une règle de plus, elle, en casserait trois pour en réparer une.
 *
 * ── Le garde-fou ──────────────────────────────────────────────────────────
 *
 * Ces phrases portent les faits du jeu : « 4 à 10 bisons : gains instantanés
 * de 2x à 1 000x ». Une traduction qui perd un chiffre publie une donnée
 * fausse — le pire résultat possible sur ce site. On compare donc les nombres
 * de la source et de la cible, et une entrée qui n'en rend pas exactement
 * autant est **refusée**, pas corrigée : on ne devine pas ce qui manque.
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/traduire-restes-a-la-main.ts
 *   npx tsx --env-file=.env.local scripts/traduire-restes-a-la-main.ts --appliquer
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prisma } from '@/lib/donnees/prisma';

const APPLIQUER = process.argv.includes('--appliquer');
const TABLE = resolve(process.cwd(), 'src/data/traductions-faits.json');

/**
 * Les nombres d'une phrase, séparateurs normalisés.
 *
 * Le français écrit « 1 000x » et « 96,29 % », l'anglais « 1,000x » et
 * « 96.29% ». Sans normaliser, la comparaison refuserait toutes les
 * traductions justes portant un millier — c'est-à-dire les plus intéressantes,
 * celles qui citent un plafond de gain.
 *
 * L'ordre compte : on retire d'abord les séparateurs de milliers (espace ou
 * virgule suivis d'exactement trois chiffres), et **seulement ensuite** la
 * virgule restante devient un point décimal.
 *
 * Et le « exactement trois chiffres » se dit `(?!\d)`, pas `\b` : dans
 * « 1 000x » il n'y a aucune frontière de mot entre le zéro et le x, tous
 * deux caractères de mot. La première version laissait donc passer tous les
 * milliers, c'est-à-dire précisément les plafonds de gain.
 *
 * Le `(?<=\d)` compte tout autant. Sans lui, « 3-4-4-4-3, 576 ways » perdait
 * l'espace après la virgule, puis la virgule elle-même, et les deux nombres
 * se collaient en « 3576 » : une traduction juste était refusée parce que la
 * normalisation, et elle seule, avait inventé un nombre.
 */
function nombres(texte: string): string[] {
  return (
    texte
      .replace(/(?<=\d)[\s\u00a0\u202f](?=\d{3}(?!\d))/g, '')
      .replace(/(?<=\d),(?=\d{3}(?!\d))/g, '')
      .match(/\d+(?:[.,]\d+)?/g) ?? []
  ).map((n) => n.replace(',', '.'));
}

function memesNombres(source: string, cible: string): boolean {
  const a = nombres(source).sort();
  const b = nombres(cible).sort();
  return a.length === b.length && a.every((n, i) => n === b[i]);
}

async function main() {
  const table: Record<string, string> = JSON.parse(readFileSync(TABLE, 'utf8'));
  const entrees = Object.entries(table);

  const refusees = entrees.filter(([fr, en]) => !memesNombres(fr, en));
  for (const [fr, en] of refusees) {
    console.log(`  ✗ chiffres perdus\n      « ${fr} »\n   →  « ${en} »`);
  }
  const bonnes = new Map(entrees.filter(([fr, en]) => memesNombres(fr, en) && fr !== en));
  console.log(`table : ${entrees.length} entrées · ${refusees.length} refusées · ${bonnes.size} applicables\n`);

  const jeux = await prisma.jeu.findMany({
    select: { id: true, slug: true, mecaniques: true, grille: true, lignesPaiement: true },
  });

  let touches = 0;
  let remplacements = 0;
  for (const j of jeux) {
    const mecaniques = j.mecaniques.map((m) => bonnes.get(m) ?? m);
    const grille = j.grille ? (bonnes.get(j.grille) ?? j.grille) : j.grille;
    const lignesPaiement = j.lignesPaiement
      ? (bonnes.get(j.lignesPaiement) ?? j.lignesPaiement)
      : j.lignesPaiement;

    const n =
      mecaniques.filter((m, i) => m !== j.mecaniques[i]).length +
      (grille !== j.grille ? 1 : 0) +
      (lignesPaiement !== j.lignesPaiement ? 1 : 0);
    if (!n) continue;

    touches += 1;
    remplacements += n;
    if (APPLIQUER) {
      await prisma.jeu.update({
        where: { id: j.id },
        data: { mecaniques, grille, lignesPaiement },
      });
    }
  }

  console.log(`${remplacements} chaînes remplacées sur ${touches} jeux.`);
  if (!APPLIQUER) console.log('SIMULATION — ajouter --appliquer pour écrire.');
}

main().finally(() => prisma.$disconnect());
