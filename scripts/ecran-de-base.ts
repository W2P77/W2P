/*
 * Relever la grille et les lignes de paiement sur l'écran de base des jeux.
 *
 * ── Pourquoi cet outil existe ─────────────────────────────────────────────
 *
 * 1 391 fiches en ligne ont leurs captures mais pas de grille, 1 183 pas de
 * lignes de paiement. Or ces deux faits se lisent sur UNE seule image — le
 * premier écran du jeu : on compte les rouleaux et les rangées, et le compteur
 * de lignes est affiché dans un coin. Légender une fiche demande d'ouvrir dix
 * images ; renseigner sa structure en demande une. À volume égal de lecture,
 * ce chantier-ci couvre dix fois plus de fiches.
 *
 * ── Ce que le mode --ecrire s'interdit ────────────────────────────────────
 *
 * Il ne remplit QUE des champs vides. Un champ déjà renseigné n'est jamais
 * écrasé : un relevé d'écran qui contredit la base est un autre sujet, il se
 * traite fiche par fiche, à l'image, pas en lot (Monster Superlanche a coûté
 * assez cher comme ça). Chaque valeur écrite laisse une Preuve qui nomme la
 * capture où elle se lit.
 *
 *   npx tsx --env-file=.env.local scripts/ecran-de-base.ts --studio spinomenal --limite 40
 *       télécharge l'écran de base en PNG dans /tmp/atelier-base/ pour les
 *       fiches dont la grille OU les lignes manquent, et imprime la liste.
 *
 *   npx tsx --env-file=.env.local scripts/ecran-de-base.ts --ecrire <lot.json> [--appliquer]
 *       { "<slug>": { "grille": "5×3", "lignes": "10" } }
 *       `capture` et `ou` sont facultatifs : ils servent quand la valeur se lit
 *       ailleurs que sur l'écran de base (« <slug>-regles-6.webp », « schéma
 *       des 50 lignes »), pour que la preuve nomme la bonne image.
 *       `lignes` : le nombre nu pour des lignes (« 10 »), sinon le libellé
 *       anglais affiché (« 243 ways to win », « Cluster Pays »). `grille` ne
 *       se dit jamais en français : elle s'affiche telle quelle dans les trois
 *       langues. Une valeur non lue s'omet, jamais une supposition.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';

import { prisma } from '@/lib/donnees/prisma';
import { urlPublique } from '@/lib/visuels/stockage';

const arg = (nom: string) => {
  const i = process.argv.indexOf(`--${nom}`);
  return i >= 0 ? process.argv[i + 1] : process.argv.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3);
};

const ATELIER = arg('atelier') ?? '/tmp/atelier-base';
const SAUVEGARDES = join(homedir(), 'Documents/GitHub/sauvegardes-betsrank');
const AUTEUR = 'releve-ecran (lecture de chaque capture)';

interface Capture { fichier: string; titre: string }

const vide = (v: unknown) => v === null || v === undefined || String(v).trim() === '';

/** L'écran de jeu, pas une page de règles : le fichier en `-base`, sinon le premier. */
function ecranDeBase(captures: Capture[]): Capture | undefined {
  return captures.find((c) => /-base\.webp$/.test(c.fichier)) ?? captures[0];
}

async function preparer() {
  const studio = arg('studio');
  const limite = Number(arg('limite') ?? 40);
  const jeux = await prisma.jeu.findMany({
    where: { rtpStudio: { not: null }, ...(studio ? { studio: { slug: studio } } : {}) },
    select: { slug: true, nom: true, grille: true, lignesPaiement: true, captures: true },
    orderBy: { slug: 'asc' },
  });

  /*
   * La grille d'abord : elle se lit sur toutes les images, alors que le
   * compteur de lignes n'est pas affiché par tous les studios. Sans cet ordre,
   * un lot rappelle indéfiniment les mêmes fiches — la série « 1 Reel » de
   * Spinomenal (45 jeux en 1×1) n'affiche aucun compteur et reviendrait à
   * chaque tirage. Un jeu à un seul symbole n'a d'ailleurs pas de ligne de
   * paiement à montrer : on ne le rappelle plus.
   */
  const avecCaptures = jeux.filter((j) => Array.isArray(j.captures) && (j.captures as unknown as Capture[]).length > 0);
  const candidats = [
    ...avecCaptures.filter((j) => vide(j.grille)),
    ...avecCaptures.filter((j) => !vide(j.grille) && vide(j.lignesPaiement) && String(j.grille) !== '1×1'),
  ].slice(0, limite);

  mkdirSync(ATELIER, { recursive: true });
  console.log(`${candidats.length} fiches à relever${studio ? ` (studio ${studio})` : ''} — PNG dans ${ATELIER}\n`);

  for (const jeu of candidats) {
    const c = ecranDeBase(jeu.captures as unknown as Capture[]);
    if (!c) continue;
    const png = join(ATELIER, `${jeu.slug}.png`);
    const r = await fetch(urlPublique(c.fichier), { signal: AbortSignal.timeout(30_000) });
    if (!r.ok) { console.log(`  ! ${jeu.slug} — écran de base introuvable au stockage (${r.status})`); continue; }
    await sharp(Buffer.from(await r.arrayBuffer())).png().toFile(png);
    const manque = [vide(jeu.grille) ? 'grille' : null, vide(jeu.lignesPaiement) ? 'lignes' : null].filter(Boolean).join(' + ');
    console.log(`  ${png}`);
    console.log(`     ${jeu.nom} — manque : ${manque}` +
      `${vide(jeu.grille) ? '' : ` (grille déjà en base : ${jeu.grille})`}` +
      `${vide(jeu.lignesPaiement) ? '' : ` (lignes déjà en base : ${jeu.lignesPaiement})`}`);
  }
  await prisma.$disconnect();
}

async function ecrire(chemin: string) {
  const appliquer = process.argv.includes('--appliquer');
  const lot = JSON.parse(readFileSync(chemin, 'utf-8')) as Record<
    string,
    { grille?: string; lignes?: string; capture?: string; ou?: string }
  >;
  const jeux = await prisma.jeu.findMany({
    where: { slug: { in: Object.keys(lot) } },
    select: { id: true, slug: true, grille: true, lignesPaiement: true, demoUrl: true, captures: true },
  });

  const absents = Object.keys(lot).filter((s) => !jeux.some((j) => j.slug === s));
  if (absents.length) console.log(`slugs introuvables en base : ${absents.join(', ')}\n`);

  if (appliquer) {
    const nom = `w2s-structure-${chemin.split('/').pop()?.replace(/\.json$/, '')}-avant.json`;
    writeFileSync(join(SAUVEGARDES, nom), JSON.stringify(jeux.map(({ captures, ...j }) => j), null, 1));
  }

  let ecrits = 0;
  const ignores: string[] = [];
  for (const jeu of jeux) {
    const r = lot[jeu.slug];
    const data: { grille?: string; lignesPaiement?: string } = {};
    if (r.grille && vide(jeu.grille)) data.grille = r.grille;
    else if (r.grille && String(jeu.grille) !== r.grille) ignores.push(`${jeu.slug} : grille en base « ${jeu.grille} », relevé « ${r.grille} » — non écrasée`);
    if (r.lignes && vide(jeu.lignesPaiement)) data.lignesPaiement = r.lignes;
    else if (r.lignes && String(jeu.lignesPaiement) !== r.lignes) ignores.push(`${jeu.slug} : lignes en base « ${jeu.lignesPaiement} », relevé « ${r.lignes} » — non écrasées`);
    if (!Object.keys(data).length) continue;

    console.log(`${jeu.slug} : ${Object.entries(data).map(([k, v]) => `${k} → ${v}`).join(' ; ')}`);
    if (!appliquer) { ecrits++; continue; }

    await prisma.jeu.update({ where: { id: jeu.id }, data });
    /*
     * D'où vient la valeur. Par défaut l'écran de base, mais une capture prise
     * pendant l'intro ne montre pas la grille : le schéma des lignes d'une page
     * de règles la donne alors (the-wild-300 : 5×4 lu sur le schéma des 50
     * lignes). Le relevé peut donc nommer sa propre capture — une preuve qui
     * désigne la mauvaise image ne prouve rien.
     */
    const captures = jeu.captures as unknown as Capture[];
    const capture = r.capture && captures.some((c) => c.fichier === r.capture)
      ? r.capture
      : ecranDeBase(captures)?.fichier ?? null;
    if (r.capture && capture !== r.capture) console.log(`  ! ${jeu.slug} — capture « ${r.capture} » absente de la fiche, preuve posée sur l'écran de base`);
    const ou = r.ou ?? 'écran de base';
    for (const [champ, valeur] of Object.entries(data)) {
      await prisma.preuve.create({
        data: {
          jeuId: jeu.id, champ, valeurBrute: valeur, type: 'REGLES_DU_JEU',
          url: jeu.demoUrl, libelle: r.capture ? 'Panneau de règles du jeu' : 'Écran de jeu de la démo officielle',
          capture, reference: ou, verifieePar: AUTEUR,
          note: `Champ vide en base ; valeur lue sur ${ou} (rouleaux et rangées comptés, compteur de lignes affiché).`,
        },
      });
    }
    ecrits++;
  }

  if (ignores.length) console.log(`\ncontredits, laissés en l'état (à traiter fiche par fiche) :\n  ${ignores.join('\n  ')}`);
  console.log(appliquer ? `\nAPPLIQUÉ — ${ecrits} fiches` : `\nSIMULATION — ${ecrits} fiches ; relancer avec --appliquer`);
  await prisma.$disconnect();
}

const lot = arg('ecrire');
(lot ? ecrire(lot) : preparer()).catch((e) => { console.error(e); process.exit(1); });
