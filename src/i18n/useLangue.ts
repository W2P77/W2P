'use client';

import { usePathname } from 'next/navigation';

import { LANGUE_DEFAUT, estUneLangue, type Langue } from './langues';
import { textes } from './textes';

/**
 * La langue courante et ses textes, pour un composant client.
 *
 * Elle est lue dans le chemin plutôt que passée en propriété : l'URL la porte
 * déjà, et la faire descendre jusqu'à chaque composant reviendrait à
 * dupliquer une information dont on dispose. `usePathname` fonctionne aussi
 * au rendu serveur, donc le texte sort **déjà traduit dans le HTML** — il
 * n'apparaît pas en anglais avant d'être corrigé au montage.
 */
export function useLangue(): { langue: Langue; t: ReturnType<typeof textes> } {
  const chemin = usePathname() ?? '/';
  const premier = chemin.split('/')[1] ?? '';
  const langue = estUneLangue(premier) ? premier : LANGUE_DEFAUT;
  return { langue, t: textes(langue) };
}
