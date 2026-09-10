'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';

import { cheminPublic } from '@/i18n/chemins';
import { LANGUE_DEFAUT, estUneLangue } from '@/i18n/langues';

/**
 * Un lien interne qui porte la langue courante, sans qu'on ait à la lui dire.
 *
 * ── Pourquoi un composant plutôt qu'une propriété partout ─────────────────
 *
 * Les liens internes sont répartis dans seize fichiers, moitié composants
 * serveur, moitié composants client. Faire descendre la langue en propriété
 * jusqu'à chacun aurait touché toute l'arborescence pour une information que
 * l'URL porte déjà. Ce composant la lit dans le chemin.
 *
 * `usePathname` est disponible au rendu serveur pour un composant client :
 * l'adresse sort donc **déjà complète dans le HTML**, elle n'est pas corrigée
 * après coup au montage. Un lien qui changerait d'adresse après hydratation
 * serait suivi par les moteurs dans sa version fausse.
 *
 * ── Ce qu'on lui passe ────────────────────────────────────────────────────
 *
 * Un chemin **interne**, commençant par `/` et sans langue : `/favorites`,
 * `/slot/x/y`. Le composant pose la langue **et traduit le premier segment**
 * — `/favorites` devient `/fr/favoris` ou `/de/favoriten`.
 *
 * Écrire une langue ou un slug traduit en dur dans un lien le figerait : un
 * visiteur en allemand se retrouverait ramené à l'anglais sans l'avoir
 * demandé.
 */
export function Lien({ href, ...reste }: ComponentProps<typeof Link> & { href: string }) {
  const chemin = usePathname() ?? '/';
  const premier = chemin.split('/')[1] ?? '';
  const langue = estUneLangue(premier) ? premier : LANGUE_DEFAUT;

  // Les adresses externes et les ancres passent sans être touchées.
  const interne = href.startsWith('/') && !href.startsWith('//');
  const cible = interne ? cheminPublic(href, langue) : href;

  return <Link href={cible} {...reste} />;
}
