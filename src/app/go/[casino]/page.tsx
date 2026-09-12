import { notFound, redirect } from 'next/navigation';

import { prisma } from '@/lib/donnees/prisma';
import { nouveauClickId } from '@/lib/tracking/click-id';
import { buildAffiliateRedirectUrl, resolveCasinoPlayUrl } from '@/lib/tracking/url-partenaire';
import { enregistrerClic } from '@/lib/tracking/clics';
import { notifierClicDiscord } from '@/lib/discord/notif-clic';
import { LANGUE_DEFAUT, estUneLangue } from '@/i18n/langues';
import { offreTraduite } from '@/lib/traduire-donnees';

import { EcranDeSortie } from './EcranDeSortie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * La sortie vers un partenaire : le seul endroit où un lead se crée.
 *
 * ── Pourquoi un écran plutôt qu'une 302 ───────────────────────────────────
 *
 * La redirection était immédiate. Le visiteur quittait where2spin sans savoir
 * d'où venait le lien, et arrivait chez l'opérateur sans transition : trois
 * secondes sous notre marque, avec le bonus rappelé, valent mieux qu'un saut
 * sec — c'est ce que fait déjà BetsRank, et c'est la même maison.
 *
 * ── Ce qui n'a pas changé, et ne doit pas changer ─────────────────────────
 *
 * Le clic est enregistré **ici, côté serveur**, avant que la page ne s'affiche
 * — pas par un `fetch` depuis le navigateur. Une fois le visiteur parti, il
 * n'y a plus de requête pour le faire, et un bloqueur de scripts ne doit pas
 * pouvoir effacer un lead. Le clickId garde son préfixe `w2p-` : c'est lui,
 * et lui seul, qui porte l'origine jusqu'au postback.
 */
export default async function PageDeSortie({
  params,
  searchParams,
}: {
  params: Promise<{ casino: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { casino: slug } = await params;
  const requete = await searchParams;

  const casino = await prisma.casino.findUnique({ where: { slug } });
  if (!casino || !casino.actif) redirect('/en/catalogue');

  const jeu = typeof requete.slot === 'string' ? requete.slot : null;
  const demandee = typeof requete.l === 'string' ? requete.l : '';
  const langue = estUneLangue(demandee) ? demandee : LANGUE_DEFAUT;

  const clickId = nouveauClickId();
  const playUrl = resolveCasinoPlayUrl({ playUrl: casino.playUrl, playUrlByCountry: undefined }, null);

  // Un enregistrement raté ne doit pas retenir le visiteur : on perd la trace,
  // pas le lead. La notification Discord est du même ordre — jamais bloquante.
  await enregistrerClic({ clickId, casinoSlug: casino.slug, jeu, pays: null, referer: null }).catch(() => {});
  await notifierClicDiscord({ casinoNom: casino.nom, casinoSlug: casino.slug, clickId, jeu }).catch(() => {});

  const cible = buildAffiliateRedirectUrl(playUrl, clickId);
  if (!cible) notFound();

  return (
    <EcranDeSortie
      cible={cible}
      nom={casino.nom}
      logo={casino.logo}
      bonus={offreTraduite(casino.bonusTexte, langue)}
      langue={langue}
    />
  );
}
