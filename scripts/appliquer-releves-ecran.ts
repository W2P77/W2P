/*
 * Reporter sur where2spin les relevés d'écran faits pour BetsRank (19/09/2026).
 *
 * ── D'où viennent ces relevés ─────────────────────────────────────────────
 *
 * BetsRank a relu, capture par capture, les 581 jeux Pragmatic qui en ont —
 * les mêmes captures que celles de where2spin, stockées dans le même bucket.
 * 62 % portaient au moins un fait faux sur la grille, les lignes ou le gain
 * maximum. where2spin porte les mêmes jeux et, pour une large part, les mêmes
 * erreurs : 96 plafonds, 168 grilles, 218 lignes contredits par l'écran.
 * Chaque valeur spectaculaire a été revérifiée à l'image avant d'écrire.
 *
 * ── Pourquoi une preuve par champ corrigé ─────────────────────────────────
 *
 * Règle du dépôt : le panneau fait autorité, mais un écart n'est jamais écrasé
 * en silence. Chaque correction laisse donc une ligne `Preuve` qui nomme la
 * capture et la page où la valeur se lit, et garde l'ancienne valeur en note.
 *
 * ── Les preuves automatiques contredites ──────────────────────────────────
 *
 * `adopter-preuves.ts` attachait le gain maximum en base à la capture qui porte
 * le RTP. Mais cette page ne montre presque jamais le plafond : il vit sur une
 * autre page (« MAX WIN »). La preuve affirmait donc avoir lu une valeur que
 * sa capture ne contient pas — sur Monster Superlanche, « 20 000x » sur une page
 * où aucun 20 000 n'apparaît ; l'écran dit 5 000x. Ces preuves ne sont pas
 * supprimées (la table garde l'historique, c'est le cas qu'elle doit montrer) :
 * elles sont annotées.
 *
 * ── Ce que le script ne touche pas ────────────────────────────────────────
 *
 * - un RTP déjà à confiance STUDIO : il a été lu à la source, on ne le touche
 *   pas. Les autres sont corrigés AVEC leurs métadonnées (règle du dépôt : la
 *   source voyage avec le chiffre qu'elle atteste) — sauf si une légende cite
 *   l'ancien chiffre, auquel cas on publierait la contradiction en image ;
 * - une grille libellée en français (« extensible », « rangée ») : `grille`
 *   s'affiche telle quelle dans les trois langues ;
 * - un champ que le relevé laisse à null : non lu, donc pas touché.
 *
 *   npx tsx --env-file=.env.local scripts/appliquer-releves-ecran.ts
 *   … --appliquer
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { prisma } from '@/lib/donnees/prisma';

const APPLIQUER = process.argv.includes('--appliquer');
const DOSSIER = join(homedir(), 'Documents/GitHub/sauvegardes-betsrank');
const AUTEUR = 'releve-ecran (lecture de chaque capture)';

interface Releve {
  complet?: boolean;
  reels?: string | null;
  pay?: { type?: string | null; n?: number | null } | null;
  maxWin?: number | null;
  rtp?: number | null;
  pages?: string | null;
  sources?: Record<string, string | null> | null;
}

const chiffres = (t: unknown) => (String(t ?? '').replace(/[\s  .,]/g, '').match(/\d+/g) ?? []).join('-');
const espace = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** La grille dans le vocabulaire du site, ou null si elle ne se dit qu'en français. */
function grilleSite(reels: string | null | undefined): string | null {
  if (!reels) return null;
  const m = reels.match(/^(\d+) rouleaux Megaways$/);
  if (m) return `${m[1]} reels Megaways`;
  return /^[\d×x\-]+$/.test(reels) ? reels.replace(/x/g, '×') : null;
}

/**
 * Les lignes dans le vocabulaire du site. Un nombre nu, parce que la FAQ écrit
 * « 20 lignes de paiement » / « 20 paylines » / « 20 Gewinnlinien » autour.
 */
function lignesSite(pay: Releve['pay']): string | null {
  if (!pay?.type) return null;
  if (pay.type === 'lignes') return pay.n ? String(pay.n) : null;
  if ((pay.type === 'facons' || pay.type === 'megaways') && pay.n) return `${espace(pay.n)} ways to win`;
  if (pay.type === 'cluster') return 'Cluster Pays';
  if (pay.type === 'anywhere') return 'Pay Anywhere';
  return null;
}

/** Le fichier de capture où se lit la valeur : « 05-regles-4 » → « <slug>-regles-4.webp ». */
const capture = (slug: string, source: string | null | undefined) =>
  source ? `${slug}-${source.replace(/^\d+-/, '').replace(/\s.*$/, '')}.webp` : null;

async function main() {
  const releves: Record<string, Releve> = {};
  for (const f of readdirSync(DOSSIER).filter((f) => /^releve-structure-(lot\d+|orphelines-releve)\.json$/.test(f))) {
    Object.assign(releves, JSON.parse(readFileSync(join(DOSSIER, f), 'utf8')));
  }

  const jeux = await prisma.jeu.findMany({
    where: { slug: { in: Object.keys(releves) } },
    select: {
      id: true, slug: true, demoUrl: true, grille: true, lignesPaiement: true, gainMaxMultiple: true, rtpStudio: true, rtpConfiance: true, captures: true,
      preuves: { where: { champ: 'gainMaxMultiple', verifieePar: 'capture-automatique' }, select: { id: true, valeurBrute: true, capture: true, note: true } },
    },
  });

  if (APPLIQUER) {
    writeFileSync(join(DOSSIER, 'w2p-releves-ecran-avant-2026-09-19.json'), JSON.stringify(jeux, null, 1));
  }

  const bilan = { rtp: 0, grille: 0, lignes: 0, gainMax: 0, preuves: 0, annotees: 0, grilleFr: 0 };
  const rtpEcarts: string[] = [];
  const exemples: string[] = [];

  for (const jeu of jeux) {
    const r = releves[jeu.slug];
    const data: { grille?: string; lignesPaiement?: string; gainMaxMultiple?: number } = {};
    const preuves: Array<{ champ: string; valeur: string; source: string | null | undefined; ancienne: unknown }> = [];

    const g = grilleSite(r.reels);
    if (r.reels && !g) bilan.grilleFr++;
    if (g && jeu.grille && chiffres(g) !== chiffres(jeu.grille) && !/megaways/i.test(`${g} ${jeu.grille}`)) {
      data.grille = g; preuves.push({ champ: 'grille', valeur: r.reels!, source: r.sources?.reels, ancienne: jeu.grille });
    }

    const l = lignesSite(r.pay);
    const nombreDuSite = chiffres(jeu.lignesPaiement);
    const contredit = l && jeu.lignesPaiement && (
      r.pay?.n ? !nombreDuSite.split('-').includes(String(r.pay.n)) : /^\d+$/.test(jeu.lignesPaiement.trim())
    );
    if (contredit) {
      data.lignesPaiement = l!; preuves.push({ champ: 'lignesPaiement', valeur: l!, source: r.sources?.pay, ancienne: jeu.lignesPaiement });
    }

    if (r.maxWin && jeu.gainMaxMultiple != null && jeu.gainMaxMultiple !== r.maxWin) {
      data.gainMaxMultiple = r.maxWin; preuves.push({ champ: 'gainMaxMultiple', valeur: String(r.maxWin), source: r.sources?.maxWin, ancienne: jeu.gainMaxMultiple });
    }

    let rtp: number | null = null;
    if (r.rtp && jeu.rtpStudio != null && Math.abs(Number(jeu.rtpStudio) - r.rtp) > 0.011) {
      const ancien = Number(jeu.rtpStudio);
      const legendes = JSON.stringify(jeu.captures ?? []);
      const citeAncien = [ancien.toFixed(2), ancien.toFixed(1), String(ancien)].some((f) => legendes.includes(`${f}%`) || legendes.includes(`${f.replace('.', ',')} %`));
      if (jeu.rtpConfiance === 'STUDIO') rtpEcarts.push(`${jeu.slug} : site ${ancien} (STUDIO, non touché) / écran ${r.rtp}`);
      else if (citeAncien) rtpEcarts.push(`${jeu.slug} : site ${ancien} / écran ${r.rtp} — une légende cite l'ancien chiffre, non touché`);
      else { rtp = r.rtp; preuves.push({ champ: 'rtpStudio', valeur: String(r.rtp), source: r.sources?.rtp, ancienne: ancien }); }
    }

    if (!preuves.length) continue;
    if (data.grille) bilan.grille++;
    if (data.lignesPaiement) bilan.lignes++;
    if (data.gainMaxMultiple) bilan.gainMax++;
    if (rtp) bilan.rtp++;
    if (exemples.length < 8) exemples.push(`${jeu.slug} : ${preuves.map((p) => `${p.champ} « ${p.ancienne} » → « ${p.champ === 'grille' ? data.grille : p.champ === 'lignesPaiement' ? data.lignesPaiement : p.valeur} »`).join(' ; ')}`);

    if (!APPLIQUER) { bilan.preuves += preuves.length; continue; }

    await prisma.jeu.update({
      where: { id: jeu.id },
      data: rtp ? { ...data, rtpStudio: rtp, rtpSource: `${jeu.demoUrl} — panneau de règles`, rtpConfiance: 'STUDIO', rtpVerifieLe: new Date() } : data,
    });
    for (const p of preuves) {
      await prisma.preuve.create({
        data: {
          jeuId: jeu.id, champ: p.champ, valeurBrute: p.valeur, type: 'REGLES_DU_JEU',
          url: jeu.demoUrl, libelle: 'Panneau de règles du jeu', capture: capture(jeu.slug, p.source),
          reference: r.pages ?? null, verifieePar: AUTEUR, note: `Ancienne valeur : ${p.ancienne}`,
        },
      });
      bilan.preuves++;
    }
    if (data.gainMaxMultiple) {
      for (const vieille of jeu.preuves.filter((p) => Number(p.valeurBrute) !== data.gainMaxMultiple)) {
        await prisma.preuve.update({
          where: { id: vieille.id },
          data: { note: `Contredite le 19/09/2026 : la capture ${vieille.capture ?? '(aucune)'} porte le RTP, pas le plafond. Valeur héritée de l'import, jamais lue. L'écran dit ${data.gainMaxMultiple}x (${capture(jeu.slug, r.sources?.maxWin)}).` },
        });
        bilan.annotees++;
      }
    }
  }

  console.log(`jeux relevés présents sur le site : ${jeux.length}`);
  console.log(`corrigés — RTP ${bilan.rtp}, grille ${bilan.grille}, lignes ${bilan.lignes}, gain max ${bilan.gainMax} | preuves ${bilan.preuves} | preuves automatiques annotées ${bilan.annotees}`);
  console.log(`grilles non reportées (libellé en français) : ${bilan.grilleFr}`);
  console.log(`\nexemples :\n  ${exemples.join('\n  ')}`);
  console.log(`\nécarts de RTP laissés en l'état, avec la raison (${rtpEcarts.length}) :\n  ${rtpEcarts.join('\n  ')}`);
  console.log(APPLIQUER ? '\nAPPLIQUÉ' : '\nSIMULATION — relancer avec --appliquer');
  await prisma.$disconnect();
}
main();
