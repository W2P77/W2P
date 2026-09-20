/*
 * Lire la grille et les lignes sur la fiche produit du studio.
 *
 * ── Pourquoi cette source ─────────────────────────────────────────────────
 *
 * Tous les studios n'écrivent pas leur structure à l'écran. Wazdan n'affiche
 * presque jamais le nombre de lignes ; Endorphina est injouable depuis la
 * France, donc incapturable d'ici. Or ces studios PUBLIENT la réponse sur la
 * fiche produit de chaque jeu — et la base porte déjà l'adresse de ces fiches
 * dans `rtpSource`, héritée de la campagne RTP de septembre. Aucune URL n'est
 * fabriquée ici : on relit une page qu'on a déjà visitée pour le RTP.
 *
 * ── Ce que le script s'interdit ───────────────────────────────────────────
 *
 * - Il ne remplit QUE les champs vides. Ce qui a été lu sur l'écran du jeu
 *   fait autorité et n'est jamais remplacé : sur Black Hawk Deluxe, l'épée
 *   affiche « 27 WIN LINES » quand la fiche produit dit 54 — Wazdan recopie
 *   les specs du jeu de base sur ses variantes Deluxe.
 * - Il ne déduit rien. Si la page donne les rouleaux sans les rangées, la
 *   grille n'est pas écrite : « 5 rouleaux » n'est pas une grille.
 * - Une page absente (404) ou sans bloc de specs n'est pas une erreur, c'est
 *   un studio qui ne publie pas — le script le compte et passe.
 *
 *   npx tsx --env-file=.env.local scripts/moissonner-specs-studio.ts --studio endorphina [--appliquer] [--limite N]
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
const STUDIO = arg('studio');
const LIMITE = Number(arg('limite') ?? 400);
const PAUSE_MS = Number(arg('pause') ?? 1500);
const NAVIGATEUR = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const SAUVEGARDES = join(homedir(), 'Documents/GitHub/sauvegardes-betsrank');

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Le HTML de ces pages est indenté sur plusieurs lignes : on l'aplatit avant de lire. */
const aplatir = (html: string) => html.replace(/\s+/g, ' ');

interface Specs { grille?: string; lignes?: string }

/** Le bloc JSON de la plateforme Evolution, partage par Red Tiger et NetEnt. */
function lireEvolution(html: string): Specs {
  const s: Specs = {};
  const g = html.match(/"rowsReels"\s*:\s*"(\d+\s*[x\u00d7]\s*\d+)"/i);
  if (g) s.grille = g[1].replace(/\s*[x\u00d7]\s*/i, '\u00d7');
  const type = html.match(/"winType"\s*:\s*"([^"]*)"/i)?.[1] ?? '';
  const n = html.match(/"playLinesMax"\s*:\s*(\d+)/i)?.[1];
  const min = html.match(/"playLinesMin"\s*:\s*(\d+)/i)?.[1];
  if (n) {
    if (/ways/i.test(type)) s.lignes = `${Number(n).toLocaleString('en-US')} ways to win`;
    else if (min && min !== n) s.lignes = `${min} to ${n} selectable lines`;
    else s.lignes = n;
  }
  return s;
}


/**
 * Un lecteur par studio. Chacun rend ce que SA page écrit, jamais plus :
 * une grille n'est retournée que si les rangées sont publiées.
 */
const LECTEURS: Record<string, (html: string) => Specs> = {
  /** `<h3>Reels and Rows: <span>5x3</span></h3>` et `<h3>Lines: <span>5</span></h3>` */
  endorphina(html) {
    const champs = new Map<string, string>();
    for (const m of aplatir(html).matchAll(/<h3>([^<:]{2,28}):\s*<span>([^<]*)<\/span>/g)) {
      champs.set(m[1].trim().toLowerCase(), m[2].trim());
    }
    const s: Specs = {};
    const g = champs.get('reels and rows');
    if (g && /^\d+\s*[x×]\s*\d+$/i.test(g)) s.grille = g.replace(/\s*[x×]\s*/i, '×');
    const l = champs.get('lines');
    /* « 100 fixed » : le site ecrit « N lignes de paiement » autour, le nombre nu suffit. */
    if (l) s.lignes = l.replace(/^(\d+)\s*fixed$/i, '$1');
    return s;
  },

  /** `<p>Reels: <span>5</span></p>`, `<p>Reels position: <span>3</span></p>`, `<p>Paylines: <span>10</span></p>` */
  amusnet(html) {
    const champs = new Map<string, string>();
    for (const m of aplatir(html).matchAll(/<p>([^<:]{2,28}):\s*<span>([^<]*)<\/span>/g)) {
      champs.set(m[1].trim().toLowerCase(), m[2].trim());
    }
    const s: Specs = {};
    const r = champs.get('reels');
    const rangees = champs.get('reels position');
    if (r && rangees && /^\d+$/.test(r) && /^\d+$/.test(rangees)) s.grille = `${r}×${rangees}`;
    const l = champs.get('paylines');
    if (l) s.lignes = l;
    return s;
  },

  /** Table « Reels / 5x3 » et « Lines / 10 paylines », en blocs <div> successifs. */
  'fantasma-games'(html) {
    const plat = aplatir(html);
    const s: Specs = {};
    const g = plat.match(/>\s*Reels\s*<\/div>\s*<div[^>]*>\s*([0-9]+\s*[x×]\s*[0-9]+)/i);
    if (g) s.grille = g[1].replace(/\s*[x×]\s*/i, '×');
    const l = plat.match(/>\s*Lines\s*<\/div>\s*<div[^>]*>\s*([^<]{1,40}?)\s*<\/div>/i);
    if (l) s.lignes = l[1].replace(/ /g, ' ').trim();
    return s;
  },

  /*
   * Red Tiger et NetEnt partagent la plateforme d'Evolution : la page porte un
   * bloc JSON avec `"rowsReels":"5x3"`, `"playLinesMax"` et `"winType"`. C'est
   * la seule structure qu'on ait pour ces deux studios — leurs démos sont
   * injouables depuis la France, donc incapturables d'ici.
   */
  'red-tiger': lireEvolution,
  netent: lireEvolution,

  /** Table `<td>Paylines</td><td>50</td>` sur la fiche portfolio. */
  spinomenal(html) {
    const s: Specs = {};
    const l = aplatir(html).match(/<td>\s*Paylines\s*<\/td>\s*<td>\s*([^<]{1,40}?)\s*<\/td>/i);
    if (l) s.lignes = l[1].trim();
    return s;
  },
};

async function main() {
  if (!STUDIO || !LECTEURS[STUDIO]) {
    console.error(`--studio manquant ou inconnu. Studios lus : ${Object.keys(LECTEURS).join(', ')}`);
    process.exit(1);
  }
  const lire = LECTEURS[STUDIO];

  const jeux = await prisma.jeu.findMany({
    where: { studio: { slug: STUDIO }, rtpStudio: { not: null }, rtpSource: { not: null } },
    select: { id: true, slug: true, grille: true, lignesPaiement: true, rtpSource: true },
    orderBy: { slug: 'asc' },
  });
  const candidats = jeux
    .filter((j) => !String(j.grille ?? '').trim() || !String(j.lignesPaiement ?? '').trim())
    .slice(0, LIMITE);
  console.log(`${candidats.length} fiches ${STUDIO} incomplètes, sur ${jeux.length}\n`);

  const bilan = { lues: 0, grilles: 0, lignes: 0, absentes: 0, sansSpec: 0 };
  const recolte: Record<string, Specs & { url: string }> = {};
  const desaccords: string[] = [];

  for (const jeu of candidats) {
    const url = String(jeu.rtpSource).replace(/\s+—.*$/, '').trim();
    let html = '';
    try {
      const r = await fetch(url, { headers: { 'user-agent': NAVIGATEUR }, redirect: 'follow', signal: AbortSignal.timeout(25_000) });
      if (!r.ok) { bilan.absentes++; await dormir(PAUSE_MS); continue; }
      html = await r.text();
    } catch { bilan.absentes++; await dormir(PAUSE_MS); continue; }
    await dormir(PAUSE_MS);

    const s = lire(html);
    if (!s.grille && !s.lignes) { bilan.sansSpec++; continue; }
    bilan.lues++;
    recolte[jeu.slug] = { ...s, url };

    const data: { grille?: string; lignesPaiement?: string } = {};
    if (s.grille && !String(jeu.grille ?? '').trim()) data.grille = s.grille;
    else if (s.grille && String(jeu.grille) !== s.grille) desaccords.push(`${jeu.slug} : grille lue à l'écran « ${jeu.grille} », fiche produit « ${s.grille} » — non écrasée`);
    if (s.lignes && !String(jeu.lignesPaiement ?? '').trim()) data.lignesPaiement = s.lignes;
    else if (s.lignes && String(jeu.lignesPaiement) !== s.lignes) desaccords.push(`${jeu.slug} : lignes à l'écran « ${jeu.lignesPaiement} », fiche produit « ${s.lignes} » — non écrasées`);
    if (!Object.keys(data).length) continue;

    console.log(`  ${jeu.slug.padEnd(40)} ${Object.entries(data).map(([k, v]) => `${k} → ${v}`).join(' ; ')}`);
    if (data.grille) bilan.grilles++;
    if (data.lignesPaiement) bilan.lignes++;
    if (!APPLIQUER) continue;

    await prisma.jeu.update({ where: { id: jeu.id }, data });
    for (const [champ, valeur] of Object.entries(data)) {
      await prisma.preuve.create({
        data: {
          jeuId: jeu.id, champ, valeurBrute: valeur, type: 'STUDIO',
          url, libelle: 'Fiche produit du studio', reference: `${s.grille ?? '—'} / ${s.lignes ?? '—'}`,
          verifieePar: `fiche-produit-${STUDIO}`,
          note: 'Champ vide en base. Ce que montre l écran du jeu reste prioritaire : un studio recopie parfois les specs du jeu de base sur ses variantes.',
        },
      });
    }
  }

  writeFileSync(join(SAUVEGARDES, `specs-${STUDIO}-2026-09-20.json`), JSON.stringify(recolte, null, 1));
  console.log(`\npages lues ${bilan.lues} | grilles ${bilan.grilles} | lignes ${bilan.lignes} | page absente ${bilan.absentes} | page sans specs ${bilan.sansSpec}`);
  if (desaccords.length) console.log(`\ndésaccords avec l'écran (${desaccords.length}), rien écrit :\n  ${desaccords.slice(0, 20).join('\n  ')}`);
  console.log(APPLIQUER ? '\nAPPLIQUÉ' : '\nSIMULATION — relancer avec --appliquer');
  await prisma.$disconnect();
}
main();
