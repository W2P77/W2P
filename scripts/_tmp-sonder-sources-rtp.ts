/**
 * Quels studios publient VRAIMENT un RTP sur leur site ?
 *
 * 5 588 jeux sur 11 658 (48 %) n'ont pas de RTP, et **aucun** ne porte de
 * `rtpSource` : le moissonneur existant, qui relit une adresse deja visitee,
 * ne peut rien pour eux. La question prealable n'est donc pas « comment
 * lire » mais « y a-t-il quelque chose a lire ».
 *
 * Trois sondages manuels ont deja donne des reponses opposees :
 *
 *   tada        58 Ko de HTML, aucun pourcentage      -> ne publie pas
 *   swintt      22 Mo (assets en base64), rien        -> ne publie pas
 *   microgaming <div>RTP %</div><div>96.05%</div>     -> PUBLIE
 *
 * Ce script generalise le sondage : pour chaque studio, il prend l'inventaire
 * decrit par `ouSourcer`, tire UNE fiche produit, et dit si un taux y figure.
 * Il n'ecrit rien. Son but est de chiffrer le gisement avant d'investir dans
 * un lecteur par studio.
 *
 *   npx tsx --env-file=.env.local scripts/_tmp-sonder-sources-rtp.ts
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const UA = 'Mozilla/5.0 (compatible; where2spin-catalogue/1.0)';

async function lire(url: string, ms = 30_000): Promise<string> {
  const r = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`statut ${r.status}`);
  return r.text();
}

/* Un taux de retour plausible : 80-99 avec decimales, suivi de %. Les bornes
 * ecartent les « 100% bonus » et les pourcentages de contribution. */
const TAUX = /\b(8[0-9]|9[0-9])[.,][0-9]{1,2}\s*%/g;
/*
 * Entre le mot et la valeur, on accepte TOUT — y compris un `%`.
 *
 * Premiere version : `[^%]{0,120}`, pour eviter d'attraper un taux lointain.
 * Elle echouait sur Microgaming, dont le libelle s'ecrit litteralement
 * « RTP % » : le `%` du libelle arretait la recherche au caractere suivant.
 * Le temoin l'a revele.
 */
const PRES_DU_MOT = /(?:RTP|Return\s*to\s*Player|Payout)[\s\S]{0,140}?\b(8[0-9]|9[0-9])[.,][0-9]{1,2}\s*%/i;

async function main() {
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  /* Les studios dont il reste le plus a gagner. */
  const studios = await prisma.studio.findMany({ select: { slug: true, ouSourcer: true } });
  const manques = await prisma.jeu.groupBy({ by: ['studioId'], where: { rtpStudio: null }, _count: { _all: true } });
  const ids = await prisma.studio.findMany({ select: { id: true, slug: true } });
  const parSlug = Object.fromEntries(ids.map((s) => [s.id, s.slug]));
  const manquePar: Record<string, number> = {};
  for (const m of manques) manquePar[parSlug[m.studioId]] = m._count._all;
  await prisma.$disconnect();

  const cibles = studios
    .filter((s) => (manquePar[s.slug] ?? 0) >= 100 && s.ouSourcer)
    .sort((a, b) => (manquePar[b.slug] ?? 0) - (manquePar[a.slug] ?? 0));

  /*
   * Un temoin connu-positif, teste AVANT le tableau.
   *
   * La premiere version rendait « ne publie pas » pour 18 studios en ayant
   * lu un schema XSD. Seul le fait d'avoir deja vu `96.05%` a la main sur
   * cette page a revele la panne. Sans temoin, un tableau entierement faux
   * ressemble exactement a un tableau entierement vrai.
   */
  const TEMOIN = 'https://microgaming.io/game/cricket-century-kings/';
  const vu = PRES_DU_MOT.test((await lire(TEMOIN)).replace(/\s+/g, ' '));
  if (!vu) {
    console.error(`sonde en panne : le temoin ${TEMOIN} porte 96,05 % et n'est pas vu.\nLe tableau ne vaudrait rien — arret.`);
    process.exit(2);
  }
  console.log(`temoin vu (96,05 % sur ${new URL(TEMOIN).hostname})\n`);

  console.log(`${cibles.length} studios a ≥100 jeux sans RTP\n`);
  console.log('studio'.padEnd(18) + 'manque  verdict');

  for (const s of cibles) {
    const inventaire = (s.ouSourcer ?? '').match(/https?:\/\/[^\s]+/)?.[0];
    let verdict = '(pas d’inventaire dans ouSourcer)';
    if (inventaire) {
      try {
        const index = await lire(inventaire);
        /* Une fiche produit, tirée de l'inventaire : on prend la plus
         * profonde, les URL courtes etant des pages de rubrique. */
        /*
         * Les URL se lisent dans les `<loc>`, JAMAIS dans le texte brut.
         *
         * La premiere version prenait toutes les URL du document. Sur un
         * sitemap, les premieres sont les **espaces de noms XML** :
         * `http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd` passait
         * tous les filtres — profondeur 3, pas d'extension image. La sonde a
         * donc teste un schema XSD pour 18 studios et conclu « ne publie
         * pas ». Microgaming, dont on avait lu `96.05%` a la main, en est
         * ressorti negatif : c'est ce temoin qui a revele la panne.
         */
        /*
         * Un sitemap d'index ne contient que d'autres sitemaps.
         *
         * Onze studios sont ressortis « inventaire lu, aucune fiche
         * produit » : leur `ouSourcer` pointe un `sitemap_index.xml` dont
         * tous les `<loc>` finissent en `.xml`. Le filtre les ecartait tous
         * et la sonde concluait a un inventaire vide — un verdict sur notre
         * outil, presente comme un verdict sur le studio. On descend d'un
         * niveau, une seule fois : un index d'index n'existe pas en pratique.
         */
        const locs = (x: string) => [...x.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
        let brut = locs(index);
        const sousSitemaps = brut.filter((u) => /\.xml(\?|$)/i.test(u));
        if (sousSitemaps.length && brut.every((u) => /\.xml(\?|$)/i.test(u))) {
          /* Celui qui parle de jeux, sinon le premier. */
          const choisi = sousSitemaps.find((u) => /game|slot|product/i.test(u)) ?? sousSitemaps[0];
          await new Promise((r) => setTimeout(r, 800));
          brut = locs(await lire(choisi));
        }
        const urls = brut
          .filter((u) => new URL(u).pathname.split('/').filter(Boolean).length >= 2)
          .filter((u) => !/\.(xml|jpg|png|webp|css|js|svg)(\?|$)/i.test(u));
        if (!urls.length) verdict = 'inventaire lu, aucune fiche produit';
        else {
          const page = await lire(urls[Math.min(2, urls.length - 1)]);
          const plat = page.replace(/\s+/g, ' ');
          if (PRES_DU_MOT.test(plat)) verdict = `PUBLIE — ${plat.match(PRES_DU_MOT)![0].slice(-9).trim()}`;
          else if (TAUX.test(plat)) verdict = 'taux present mais loin du mot RTP — a verifier';
          else verdict = 'ne publie pas (aucun taux dans le HTML servi)';
        }
      } catch (e) {
        verdict = `injoignable : ${String(e).slice(0, 40)}`;
      }
    }
    console.log(s.slug.padEnd(18) + String(manquePar[s.slug] ?? 0).padStart(5) + '  ' + verdict);
    await new Promise((r) => setTimeout(r, 1_200));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
