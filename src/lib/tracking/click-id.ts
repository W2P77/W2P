import { v4 as uuidv4 } from 'uuid';

/**
 * L'identifiant d'un clic sortant, et l'origine qu'il transporte.
 *
 * ── Pourquoi un préfixe ───────────────────────────────────────────────────
 *
 * where2play et BetsRank partagent le même Redis et le même endpoint de
 * postback, hébergé sur l'ancien déploiement BCE qu'on ne modifie pas. Rien
 * dans ce tuyau ne sait de quel site vient un clic — sauf le clickId lui-même.
 *
 * Le préfixe n'est pas un confort d'affichage : le postback construit
 * l'identifiant de la conversion à partir du clickId, donc l'origine se
 * retrouve **dans la clé primaire du lead**, qui est permanente. Un champ posé
 * à côté ne survivrait pas : les clics expirent à 90 jours, les conversions
 * jamais.
 *
 * ── Pourquoi BetsRank n'est pas préfixé ───────────────────────────────────
 *
 * Ce n'est pas un oubli. Tout ce qui existait avant where2play vient de
 * BetsRank, sans exception : l'absence de préfixe est un **fait**, pas une
 * valeur manquante. Ça étiquette l'historique entier correctement, sans
 * migration ni script de rattrapage.
 */
export const PREFIXE_W2P = 'w2p-';

/**
 * Saisie manuelle, quand un partenaire n'a pas de postback configuré.
 *
 * Noter qu'il commence lui aussi par `w2p-`, et pas par `manual-`. La première
 * version écrivait `manual-w2p-…`, par mimétisme avec le `manual-discord-…` de
 * BetsRank — et le test a montré qu'un tel identifiant retombait du côté de
 * BetsRank, puisqu'il ne commence pas par le préfixe du site.
 *
 * D'où l'invariant, qui vaut pour tout ce qu'on ajoutera plus tard — import,
 * API, flux partenaire : **un identifiant where2play commence par `w2p-`.**
 * Une règle unique ne se contourne pas par distraction ; une liste de cas
 * particuliers, si.
 */
export const PREFIXE_W2P_MANUEL = `${PREFIXE_W2P}manual-`;

export type Origine = 'W2P' | 'BR';

/**
 * Un clickId neuf pour un clic sortant depuis where2play.
 *
 * Le corps reste un UUID v4 : les réseaux d'affiliation acceptent déjà ce
 * format à tirets en production, donc le préfixe n'introduit aucun caractère
 * nouveau. Longueur totale 40 signes, très en dessous de toutes les limites
 * rencontrées.
 */
export function nouveauClickId(): string {
  return `${PREFIXE_W2P}${uuidv4()}`;
}

/**
 * Un clickId pour une conversion saisie à la main.
 *
 * Il doit être produit **par construction**, jamais rempli par discipline : un
 * champ qu'on peut oublier finit toujours par être oublié, et le lead
 * basculerait silencieusement du côté de BetsRank.
 */
export function nouveauClickIdManuel(): string {
  return `${PREFIXE_W2P_MANUEL}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * De quel site vient ce clic ?
 *
 * Utilisée des deux côtés — c'est elle qui alimente le badge BR / W2P du
 * tableau de bord, historique compris.
 */
export function origineDuClickId(clickId: string | null | undefined): Origine {
  const id = (clickId ?? '').trim();
  return id.startsWith(PREFIXE_W2P) ? 'W2P' : 'BR';
}
