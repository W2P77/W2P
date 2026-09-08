/**
 * Capture, lit et publie la documentation d'un lot de jeux.
 *
 * Pour chaque jeu : ouvre sa démo officielle, ferme l'écran d'accueil, capture
 * le jeu de base, les pages de règles et la boîte d'achat de bonus ; lit les
 * faits dans les règles par OCR ; téléverse les images ; met la fiche à jour.
 *
 * ── Ce qui n'est jamais écrit ─────────────────────────────────────────────
 *
 * Un fait que l'OCR n'a pas lu **avec certitude** ne touche pas la base. Le
 * niveau `STUDIO` n'est posé que si le RTP a été lu dans le panneau — sinon la
 * fiche garde son niveau précédent et les captures sont quand même publiées :
 * elles valent par elles-mêmes.
 *
 * Un RTP déjà en base et **différent** de celui lu n'est pas écrasé en
 * silence : il est signalé. Le panneau fait autorité, mais un écart signifie
 * presque toujours que quelque chose d'autre est faux — mauvais jeu, mauvaise
 * page, lecture douteuse — et l'écraser effacerait l'indice.
 *
 * ── La cadence ────────────────────────────────────────────────────────────
 *
 * Un jeu prend une minute : c'est le temps de chargement de la démo, pas le
 * nôtre. Deux navigateurs en parallèle suffisent — au-delà, on sollicite les
 * serveurs de démo d'un studio partenaire à un rythme qui se remarque, et
 * perdre cet accès coûterait tout le chantier.
 *
 * Usage :
 *   npx tsx scripts/capturer-jeux.ts --studio pragmatic-play --limite 3
 *   npx tsx scripts/capturer-jeux.ts --studio pragmatic-play --limite 40 --appliquer
 */
import { config as loadEnv } from 'dotenv';
import { mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Browser } from 'playwright';
import sharp from 'sharp';
import { ADAPTATEURS } from '../src/lib/captures/adaptateurs';
import { lireLesRegles } from '../src/lib/captures/lecture-regles';
import { televerser } from '../src/lib/visuels/stockage';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const ATELIER = resolve(process.cwd(), 'public/images/captures');
const CHROME = process.env.CHROME_BIN ?? '';
const PARALLELE = 2;

function arg(nom: string): string | undefined {
  const i = process.argv.indexOf(`--${nom}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

interface Resultat {
  slug: string;
  captures: Array<{ fichier: string; titre: string; legende: string }>;
  rtp: number | null;
  rtpMin: number | null;
  volatilite: string | null;
  gainMax: number | null;
  ecart: string | null;
}

async function capturerUnJeu(
  nav: Browser,
  jeu: { slug: string; nom: string; demoUrl: string; rtpStudio: unknown },
  adaptateur: (typeof ADAPTATEURS)[string],
): Promise<Resultat | null> {
  const page = await nav.newPage({ viewport: { width: 1280, height: 800 } });
  const dossier = join(ATELIER, jeu.slug);
  mkdirSync(dossier, { recursive: true });
  const pngRegles: string[] = [];
  const fichiers: string[] = [];

  const cliche = async (nom: string) => {
    const png = join(dossier, `${nom}.png`);
    await page.screenshot({ path: png });
    if (nom.startsWith('regles')) pngRegles.push(png);
    fichiers.push(nom);
  };

  try {
    await page.goto(jeu.demoUrl, { waitUntil: 'load', timeout: 120_000 });
    await page.waitForTimeout(adaptateur.chargementMs);
    await adaptateur.ouvrirLeJeu(page);
    await cliche('base');
    await adaptateur.capturerLesRegles(page, cliche);
    await adaptateur.capturerLAchat(page, cliche);
  } catch (e) {
    console.log(`  ! ${jeu.slug} — ${e instanceof Error ? e.message.slice(0, 60) : 'erreur'}`);
    await page.close();
    return null;
  }
  await page.close();

  const faits = await lireLesRegles(pngRegles);

  /*
   * Le panneau s'est-il seulement ouvert ?
   *
   * Sans ce contrôle, un jeu resté sur son écran d'accueil produisait neuf
   * captures du carrousel, marquées « faites » — donc publiées comme
   * documentation et jamais réessayées. Le mot « RTP » ne figure que dans le
   * panneau de règles : sa présence prouve qu'on y est entré.
   */
  const panneauOuvert = faits.pages.some((p) => /RTP|GAME RULES|PAYTABLE/i.test(p.texte));
  if (!panneauOuvert) {
    console.log(`  ! ${jeu.slug} — panneau de règles jamais atteint, jeu laissé en file`);
    return null;
  }

  /*
   * Les légendes ne reprennent **jamais** le texte OCR brut.
   *
   * L'OCR se trompe : « 96.02" » au lieu de « 96.02% », des mots avalés, des
   * guillemets fantaisistes. Publier ce texte reviendrait à mettre sur 598
   * fiches une prose que personne n'a relue. Seuls entrent les faits qui ont
   * passé les bornes de vraisemblance — et le titre que le panneau affiche
   * lui-même, qui est exact par construction.
   */
  const titrePage = (i: number) => faits.pages[i]?.titre || `Game rules, page ${i + 1}`;
  const phraseFaits = [
    faits.rtp != null ? `RTP ${faits.rtp}%` : null,
    faits.rtpMin != null ? `down to ${faits.rtpMin}% at the lower tier` : null,
    faits.volatilite ? `volatility stated as ${faits.volatilite.toLowerCase().replace('_', ' ')}` : null,
    faits.gainMax != null ? `max win ${faits.gainMax.toLocaleString('en-GB')}×` : null,
    faits.miseMin != null && faits.miseMax != null ? `bets from ${faits.miseMin} to ${faits.miseMax}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // Conversion en WebP : 27 Mo de PNG deviennent 1 Mo, pour un rendu identique
  // à l'écran. Sur 598 jeux, l'écart décide de la faisabilité du stockage.
  const captures: Resultat['captures'] = [];
  let numeroRegle = 0;
  for (const nom of fichiers) {
    const webp = `${jeu.slug}-${nom}.webp`;
    await sharp(join(dossier, `${nom}.png`)).webp({ quality: 82 }).toFile(join(ATELIER, webp));

    let titre = 'The base game';
    let legende = `${jeu.nom} as the demo opens it, before any spin.`;
    if (nom.startsWith('regles')) {
      const i = numeroRegle++;
      titre = titrePage(i);
      // La page qui porte le RTP est la seule à recevoir une légende chiffrée :
      // c'est celle qui prouve quelque chose.
      const porteLeRtp = /RTP/i.test(faits.pages[i]?.texte ?? '');
      legende = porteLeRtp && phraseFaits ? `Stated by the game itself: ${phraseFaits}.` : '';
    } else if (nom === 'achat') {
      titre = 'Buying the feature';
      legende = 'The purchase confirmation as the game presents it, before any spin is committed.';
    }
    captures.push({ fichier: webp, titre, legende });
  }
  rmSync(dossier, { recursive: true, force: true });

  const ancien = jeu.rtpStudio == null ? null : Number(jeu.rtpStudio);
  const ecart =
    faits.rtp != null && ancien != null && Math.abs(faits.rtp - ancien) > 0.01
      ? `base ${ancien} → panneau ${faits.rtp}`
      : null;

  return {
    slug: jeu.slug,
    captures,
    rtp: faits.rtp,
    rtpMin: faits.rtpMin,
    volatilite: faits.volatilite,
    gainMax: faits.gainMax,
    ecart,
  };
}

async function main() {
  const studio = arg('studio') ?? 'pragmatic-play';
  const limite = Number(arg('limite') ?? 3);
  const appliquer = process.argv.includes('--appliquer');
  const adaptateur = ADAPTATEURS[studio];
  if (!adaptateur) throw new Error(`Aucun adaptateur pour « ${studio} ».`);

  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const jeux = await prisma.jeu.findMany({
    where: {
      studio: { slug: studio },
      demoUrl: { contains: 'openGame.do' },
      capturesLe: null,
    },
    select: { id: true, slug: true, nom: true, demoUrl: true, rtpStudio: true },
    orderBy: { nom: 'asc' },
    take: limite,
  });
  console.log(`${jeux.length} jeux à capturer (studio ${studio}).\n`);

  mkdirSync(ATELIER, { recursive: true });
  const nav = await chromium.launch({
    executablePath: CHROME || undefined,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  /**
   * Publier chaque jeu dès qu'il est prêt, et non à la fin du lot.
   *
   * La première version capturait les quarante jeux, puis téléversait, puis
   * écrivait. Une coupure à la trente-neuvième perdait quarante minutes de
   * travail — et sur les 592 jeux qui restent, dix heures. Un traitement long
   * doit être **interruptible sans perte** : c'est ce qui permet de l'arrêter
   * pour autre chose, ce qui arrive tout le temps.
   *
   * Le champ `capturesLe` sert de marque-page : le programme ne reprend que
   * les jeux qui ne l'ont pas.
   */
  const publier = async (r: Resultat) => {
    if (!appliquer) return;
    for (const c of r.captures) await televerser(join(ATELIER, c.fichier), c.fichier);
    const jeu = jeux.find((j) => j.slug === r.slug)!;
    await prisma.jeu.update({
      where: { id: jeu.id },
      data: {
        captures: r.captures,
        capturesLe: new Date(),
        // Le RTP n'est écrit que s'il a été lu, et qu'il ne contredit pas la
        // base. Sinon la fiche garde ce qu'elle avait, et les captures sont
        // publiées quand même : elles valent par elles-mêmes.
        ...(r.rtp != null && !r.ecart
          ? {
              rtpStudio: r.rtp,
              ...(r.rtpMin != null ? { rtpPaliers: [r.rtp, r.rtpMin] } : {}),
              rtpSource: `${jeu.demoUrl} — panneau de règles`,
              rtpConfiance: 'STUDIO' as const,
              rtpVerifieLe: new Date(),
              confiance: 'STUDIO' as const,
            }
          : {}),
        ...(r.volatilite ? { volatilite: r.volatilite as never } : {}),
        ...(r.gainMax != null ? { gainMaxMultiple: Math.round(r.gainMax) } : {}),
      },
    });
    // Le dossier de travail ne garde rien : les images vivent chez Supabase.
    for (const c of r.captures) rmSync(join(ATELIER, c.fichier), { force: true });
  };

  const resultats: Resultat[] = [];
  for (let i = 0; i < jeux.length; i += PARALLELE) {
    const lot = await Promise.all(
      jeux.slice(i, i + PARALLELE).map((j) =>
        capturerUnJeu(nav, { ...j, demoUrl: j.demoUrl! }, adaptateur),
      ),
    );
    for (const r of lot) {
      if (!r) continue;
      resultats.push(r);
      await publier(r);
      const marque = r.rtp != null ? `RTP ${r.rtp}` : 'RTP non lu';
      console.log(`  ${r.slug.padEnd(34)} ${marque}${r.ecart ? `  ⚠ ${r.ecart}` : ''}`);
    }
    console.log(`  — ${Math.min(i + PARALLELE, jeux.length)}/${jeux.length} —`);
  }
  await nav.close();

  if (!appliquer) {
    for (const r of resultats) {
      console.log(`  ${r.slug.padEnd(34)} ${r.captures.length} captures · ${r.rtp ?? 'RTP non lu'}`);
    }
    console.log('\nSIMULATION — rien n’a été téléversé ni écrit. Ajouter --appliquer.');
    await prisma.$disconnect();
    return;
  }

  const verifies = await prisma.jeu.count({ where: { rtpConfiance: 'STUDIO' } });
  console.log(`\n${resultats.length} jeux publiés. ${verifies} fiches en source studio.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
