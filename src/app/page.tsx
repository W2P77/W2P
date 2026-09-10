import { redirect } from 'next/navigation';

import { LANGUE_DEFAUT } from '@/i18n/langues';

/**
 * La racine n'a pas de contenu propre : elle mène à la langue par défaut.
 *
 * ── Pourquoi pas une détection automatique ────────────────────────────────
 *
 * Rediriger selon l'IP ou l'en-tête `Accept-Language` renverrait Googlebot —
 * IP américaine, pas d'en-tête de langue — vers une langue choisie pour lui,
 * et ferait indexer les trois versions du site sous une seule. C'est la même
 * erreur que le middleware évite déjà pour le pays du visiteur : le serveur
 * ne décide pas à la place de celui qui regarde.
 *
 * Le visiteur choisit sa langue dans l'en-tête, et son choix tient.
 */
export default function Racine() {
  redirect(`/${LANGUE_DEFAUT}`);
}
