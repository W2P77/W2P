/*
 * Écrire à la main les légendes d'une fiche — l'outil, pas la rédaction.
 *
 * ── Pourquoi à la main ────────────────────────────────────────────────────
 *
 * La légende générée dit de quoi une page **parle** : elle est vraie, jamais
 * fausse, et c'est déjà du texte propre à chaque page. Elle ne dit pas ce que
 * la capture **montre** — la grille, le bouton d'achat et son prix, les trois
 * paliers de la table de gains, le multiplicateur qui traîne à l'écran. Gates
 * of Olympus a ces légendes-là, écrites en regardant les images ; c'est le
 * niveau qu'on veut partout.
 *
 * ── Deux modes ────────────────────────────────────────────────────────────
 *
 *   --fiche <slug>          prépare : télécharge les captures en PNG lisibles,
 *                           imprime les faits vérifiés de la fiche et la
 *                           légende actuelle de chaque capture.
 *   --ecrire <fichier.json> publie : range les légendes dans `captures[].legendes`.
 *
 * Le JSON attendu, une entrée par capture, la clé étant le **fichier** (les
 * titres se répètent, les fichiers non) :
 *
 *   { "slug": "sweet-bonanza",
 *     "legendes": { "sweet-bonanza-base.webp": { "fr": "…", "en": "…", "de": "…" } } }
 *
 * ── Ce qui est écrit, et ce qui ne l'est jamais ───────────────────────────
 *
 * Une légende décrit ce qu'on voit. Les chiffres **du jeu** — RTP, plafond,
 * volatilité — viennent de la fiche, jamais de l'image : ils y sont parfois
 * illisibles, et une valeur lue de travers publiée en source studio est le
 * pire cas du site. Les chiffres **de l'image** (les paliers d'une table de
 * gains, un prix d'achat affiché) se recopient s'ils sont nets, et se taisent
 * sinon. On ne juge pas le jeu, on ne le compare pas, on ne parle jamais d'un
 * partenaire.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';

import { prisma } from '@/lib/donnees/prisma';
import { legendesDeCaptures, legendesEcrites, type CaptureALegender } from '@/lib/legendes';
import { urlPublique } from '@/lib/visuels/stockage';

const arg = (nom: string) => {
  const i = process.argv.indexOf(`--${nom}`);
  return i >= 0 ? process.argv[i + 1] : process.argv.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3);
};

/** Là où les PNG de travail atterrissent. Ils se retéléchargent, rien n'y est précieux. */
const ATELIER = arg('atelier') ?? '/tmp/atelier-legendes';
/** Là où l'on garde ce qu'on s'apprête à écraser — `/tmp` s'efface en cours de journée. */
const SAUVEGARDES = join(homedir(), 'Documents/GitHub/sauvegardes-betsrank');

interface CaptureEnBase extends CaptureALegender {
  fichier: string;
  titre: string;
}

async function charger(slug: string) {
  const jeu = await prisma.jeu.findFirst({
    where: { slug },
    select: {
      id: true, slug: true, nom: true, rtpStudio: true, rtpPaliers: true, rtpAchatBonus: true,
      gainMaxMultiple: true, volatilite: true, grille: true, lignesPaiement: true,
      mecaniques: true, achatBonus: true, sortieLe: true,
      captures: true, studio: { select: { nom: true, slug: true } },
    },
  });
  if (!jeu) throw new Error(`fiche introuvable : ${slug}`);
  return jeu;
}

async function preparer(slug: string) {
  const jeu = await charger(slug);
  const captures = (jeu.captures as unknown as CaptureEnBase[]) ?? [];
  const dossier = join(ATELIER, slug);
  mkdirSync(dossier, { recursive: true });

  const faits = {
    slug: jeu.slug, nom: jeu.nom,
    rtp: jeu.rtpStudio == null ? null : Number(jeu.rtpStudio),
    gainMax: jeu.gainMaxMultiple, volatilite: jeu.volatilite as never,
  };
  const actuelles = legendesDeCaptures(captures, faits, 'fr');

  console.log(`\n${jeu.nom} — ${jeu.studio.nom}  (${jeu.studio.slug}/${jeu.slug})`);
  console.log('Faits vérifiés de la fiche — les seuls chiffres du jeu qu\'on ait le droit d\'affirmer :');
  console.log(`  RTP ${jeu.rtpStudio ?? '—'}${jeu.rtpPaliers?.length ? ` (paliers ${jeu.rtpPaliers.join(' / ')})` : ''}` +
    `${jeu.rtpAchatBonus ? ` · RTP achat ${jeu.rtpAchatBonus}` : ''}`);
  console.log(`  gain max ${jeu.gainMaxMultiple ?? '—'}× · volatilité ${jeu.volatilite ?? '—'}` +
    `${jeu.grille ? ` · grille ${jeu.grille}` : ''}${jeu.lignesPaiement ? ` · ${jeu.lignesPaiement}` : ''}` +
    `${jeu.achatBonus == null ? '' : ` · achat de bonus ${jeu.achatBonus ? 'oui' : 'non'}`}`);
  if (jeu.mecaniques?.length) console.log(`  mécaniques : ${jeu.mecaniques.join(', ')}`);
  console.log(`\n${captures.length} captures, converties en PNG dans ${dossier} :\n`);

  for (const [i, c] of captures.entries()) {
    const png = join(dossier, `${String(i + 1).padStart(2, '0')}-${c.fichier.replace(/\.webp$/, '.png')}`);
    const r = await fetch(urlPublique(c.fichier), { signal: AbortSignal.timeout(30_000) });
    if (!r.ok) { console.log(`  ! ${c.fichier} — introuvable au stockage (${r.status})`); continue; }
    await sharp(Buffer.from(await r.arrayBuffer())).png().toFile(png);
    const dejaEcrite = Object.keys(legendesEcrites(c.legendes)).join('/');
    console.log(`  ${png}`);
    console.log(`     fichier : ${c.fichier}`);
    console.log(`     titre   : ${c.titre}${dejaEcrite ? `   [déjà écrite : ${dejaEcrite}]` : ''}`);
    console.log(`     actuelle: ${actuelles[i]}\n`);
  }
  await prisma.$disconnect();
}

async function ecrire(chemin: string) {
  const lot = JSON.parse(readFileSync(chemin, 'utf-8')) as {
    slug: string;
    legendes: Record<string, Record<string, string>>;
  };
  const jeu = await charger(lot.slug);
  const captures = (jeu.captures as unknown as CaptureEnBase[]) ?? [];

  /*
   * La sauvegarde garde l'état **d'origine**, pas le dernier en date.
   *
   * Le nom ne portait que le jour : repasser sur une fiche déjà légendée dans
   * la journée écrasait la sauvegarde de son état initial par celle du premier
   * jet. On perdait donc exactement ce à quoi on voulait pouvoir revenir. Une
   * seconde écriture le même jour va maintenant dans un fichier numéroté, et
   * la première reste intacte.
   */
  mkdirSync(SAUVEGARDES, { recursive: true });
  const jour = new Date().toISOString().slice(0, 10);
  const base = join(SAUVEGARDES, `w2p-legendes-${lot.slug}-avant-${jour}`);
  let sauvegarde = `${base}.json`;
  for (let n = 2; existsSync(sauvegarde); n++) sauvegarde = `${base}-${n}.json`;
  writeFileSync(sauvegarde, JSON.stringify(captures, null, 2));

  const connus = new Set(captures.map((c) => c.fichier));
  const inconnus = Object.keys(lot.legendes).filter((f) => !connus.has(f));
  if (inconnus.length) throw new Error(`fichiers absents de la fiche : ${inconnus.join(', ')}`);

  let posees = 0;
  const neuves = captures.map((c) => {
    const ecrites = legendesEcrites(lot.legendes[c.fichier]);
    if (Object.keys(ecrites).length === 0) return c;
    posees++;
    return { ...c, legendes: { ...legendesEcrites(c.legendes), ...ecrites } };
  });

  await prisma.jeu.update({ where: { id: jeu.id }, data: { captures: neuves as never } });
  console.log(`${lot.slug} : ${posees} captures sur ${captures.length} ont leur légende écrite.`);
  console.log(`Sauvegarde : ${sauvegarde}`);
  console.log('La fiche change à la revalidation ISR suivante, sans build.');
  await prisma.$disconnect();
}

async function main() {
  const fiche = arg('fiche');
  const json = arg('ecrire');
  if (fiche) return preparer(fiche);
  if (json) return ecrire(json);
  console.log('Usage : --fiche <slug>   |   --ecrire <fichier.json>');
}
main().catch((e) => { console.error(e.message); process.exit(1); });
