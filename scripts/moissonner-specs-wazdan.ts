/*
 * Lire « Reels / Lines » sur la fiche produit Wazdan.
 *
 * ── Pourquoi une source de plus ───────────────────────────────────────────
 *
 * Wazdan n'écrit presque jamais le nombre de lignes sur l'écran de jeu : sur
 * la gamme moderne il n'y a rien à lire, et sur la gamme classique il y a des
 * lampes SANS numéro, qui valent N ou 2N selon la convention du jeu. Compter
 * les lampes a produit 33 valeurs fausses (« 10 » pour des jeux à 20 lignes),
 * retirées le 20/09/2026.
 *
 * Le studio, lui, publie la réponse : `wazdan.com/games/<slug>` porte une
 * ligne « Reels / Lines: 5 / 20 ». C'est cette page qu'on lit ici.
 *
 * ── Ce que le script s'interdit ───────────────────────────────────────────
 *
 * - Il ne remplit QUE les champs vides. Une valeur lue sur un badge en jeu
 *   fait autorité et n'est jamais remplacée : sur Black Hawk Deluxe, l'épée
 *   affiche « 27 WIN LINES » quand la fiche produit dit 54 — le studio recopie
 *   les specs du jeu de base sur ses variantes Deluxe. Le panneau du jeu gagne.
 * - Il ne touche pas la grille. Il la CONFRONTE au nombre de rouleaux publié
 *   et signale les désaccords, sans rien écrire : « 5 rouleaux » ne dit pas
 *   combien de rangées.
 * - Un slug absent du site (404) n'est pas une erreur : plusieurs éditions ne
 *   sont pas publiées sur le portfolio.
 *
 *   npx tsx --env-file=.env.local scripts/moissonner-specs-wazdan.ts [--appliquer] [--limite N]
 */
import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { prisma } from '@/lib/donnees/prisma';

const APPLIQUER = process.argv.includes('--appliquer');
const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const LIMITE = Number(arg('limite') ?? 400);
/** Le site coupe si on le martèle ; une seconde et demie suffit à ne pas le gêner. */
const PAUSE_MS = 1500;
const NAVIGATEUR = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const SAUVEGARDES = join(homedir(), 'Documents/GitHub/sauvegardes-betsrank');

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Specs { rouleaux: number | null; lignes: string | null; titre: string | null }

async function lireLaFiche(slug: string): Promise<Specs | null> {
  const r = await fetch(`https://wazdan.com/games/${slug}`, {
    headers: { 'user-agent': NAVIGATEUR },
    redirect: 'follow',
    signal: AbortSignal.timeout(25_000),
  });
  if (!r.ok) return null;
  const html = await r.text();
  const m = html.match(/Reels \/ Lines:\s*<b>([^<]*)<\/b>/i);
  const t = html.match(/<title>([^<]*)/i);
  if (!m) return { rouleaux: null, lignes: null, titre: t?.[1] ?? null };
  const [g, d] = m[1].split('/').map((x) => x.trim());
  return { rouleaux: Number(g) || null, lignes: d || null, titre: t?.[1] ?? null };
}

/** « 5×3 » → 5. La grille du site dit les rouleaux en premier. */
const rouleauxDe = (grille: string | null) => {
  const m = String(grille ?? '').match(/^(\d+)\s*[×x]/);
  return m ? Number(m[1]) : null;
};

async function main() {
  const jeux = await prisma.jeu.findMany({
    where: { studio: { slug: 'wazdan' }, rtpStudio: { not: null } },
    select: { id: true, slug: true, nom: true, grille: true, lignesPaiement: true, demoUrl: true },
    orderBy: { slug: 'asc' },
  });
  const candidats = jeux.filter((j) => !j.lignesPaiement || !String(j.lignesPaiement).trim()).slice(0, LIMITE);
  console.log(`${candidats.length} fiches wazdan sans lignes, sur ${jeux.length}\n`);

  const bilan = { lues: 0, posees: 0, absentes: 0, sansSpec: 0, grilleDiscordante: 0 };
  const discordances: string[] = [];
  const recolte: Record<string, Specs> = {};

  for (const jeu of candidats) {
    const s = await lireLaFiche(jeu.slug).catch(() => null);
    await dormir(PAUSE_MS);
    if (!s) { bilan.absentes++; continue; }
    recolte[jeu.slug] = s;
    if (!s.lignes) { bilan.sansSpec++; continue; }
    bilan.lues++;

    /*
     * Sur la serie « Coins », le studio ecrit le nombre de CASES la ou on
     * attend des rouleaux : « 12 Coins » est annonce « 12 / 0 » pour une
     * grille 4x3. Au-dela de 8, le chiffre publie n'est pas un nombre de
     * rouleaux et la confrontation n'a pas de sens.
     */
    const nos = rouleauxDe(jeu.grille);
    if (nos && s.rouleaux && s.rouleaux <= 8 && nos !== s.rouleaux) {
      bilan.grilleDiscordante++;
      discordances.push(`${jeu.slug} : grille lue « ${jeu.grille} », le studio annonce ${s.rouleaux} rouleaux`);
    }

    /*
     * « Lines: 0 » n'est pas une absence de donnee : c'est un jeu sans ligne
     * de paiement, toute la gamme Hold the Jackpot. Le champ s'affiche brut
     * dans les trois langues, d'ou le libelle anglais.
     */
    const valeur = s.lignes === '0' ? 'No paylines' : s.lignes;
    console.log(`  ${jeu.slug.padEnd(38)} ${String(s.rouleaux ?? '?')} rouleaux / ${valeur} lignes`);
    if (!APPLIQUER) continue;

    await prisma.jeu.update({ where: { id: jeu.id }, data: { lignesPaiement: valeur } });
    await prisma.preuve.create({
      data: {
        jeuId: jeu.id, champ: 'lignesPaiement', valeurBrute: valeur, type: 'STUDIO',
        url: `https://wazdan.com/games/${jeu.slug}`, libelle: 'Fiche produit du studio — « Reels / Lines »',
        reference: `Reels / Lines: ${s.rouleaux} / ${s.lignes}`, verifieePar: 'fiche-produit-wazdan',
        note: 'Champ vide en base ; l ecran de jeu n affiche pas de compteur. Le panneau du jeu reste prioritaire s il en montre un.',
      },
    });
    bilan.posees++;
  }

  writeFileSync(join(SAUVEGARDES, 'wazdan-specs-2026-09-20.json'), JSON.stringify(recolte, null, 1));
  console.log(`\nfiches lues ${bilan.lues} | posees ${bilan.posees} | page absente ${bilan.absentes} | page sans specs ${bilan.sansSpec}`);
  if (discordances.length) {
    console.log(`\ngrilles en desaccord avec le nombre de rouleaux publie (${discordances.length}) — rien ecrit :`);
    console.log('  ' + discordances.join('\n  '));
  }
  console.log(APPLIQUER ? '\nAPPLIQUE' : '\nSIMULATION — relancer avec --appliquer');
  await prisma.$disconnect();
}
main();
