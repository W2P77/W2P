'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Langue } from '@/i18n/langues';
import { cheminPublic } from '@/i18n/chemins';
import { LONGUEUR_MINIMALE, deplacer } from './liste';
import type { ReponseRecherche, ResultatRecherche } from './types';

/**
 * Le cerveau du champ de recherche : l'anti-rebond, l'appel, et le clavier.
 *
 * ── Pourquoi un anti-rebond, et pourquoi 180 ms ───────────────────────────
 *
 * Chaque frappe est une requête en base. « gates of olympus » en produirait
 * seize, dont quinze dont personne ne lira jamais le résultat. 180 ms est le
 * creux entre deux frappes d'une saisie normale : assez court pour que la
 * liste paraisse suivre les doigts, assez long pour qu'une saisie continue
 * n'aille en base qu'une fois.
 *
 * ── Le piège de la réponse en retard ──────────────────────────────────────
 *
 * Deux requêtes parties dans l'ordre ne reviennent pas forcément dans l'ordre.
 * Sans garde, la réponse de « gat » arrive après celle de « gates » et écrase
 * une liste juste par une liste périmée — le symptôme est une liste qui
 * « remonte le temps » d'un caractère, et il est très difficile à reproduire.
 * Deux protections se cumulent donc : la requête précédente est annulée, et
 * une réponse dont le terme ne correspond plus à la saisie est jetée.
 */
const REBOND_MS = 180;

export interface Recherche {
  terme: string;
  saisir: (valeur: string) => void;
  /** Vrai tant que la liste doit être affichée. */
  ouvert: boolean;
  fermer: () => void;
  /** Vrai pendant qu'une requête est en vol, pour le terme courant. */
  charge: boolean;
  reponse: ReponseRecherche | null;
  /** Les résultats à plat, dans l'ordre d'affichage — c'est l'ordre du clavier. */
  plat: ResultatRecherche[];
  actif: number;
  /** L'`id` du DOM de la ligne active, pour `aria-activedescendant`. */
  idActif: string | null;
  idDeLigne: (cle: string) => string;
  /** À brancher sur le champ : flèches, Entrée, Échap. */
  auClavier: (evenement: React.KeyboardEvent<HTMLInputElement>) => void;
  /** L'adresse finale d'un résultat, langue posée. */
  adresse: (resultat: ResultatRecherche) => string;
  ouvrir: (resultat: ResultatRecherche) => void;
  /** Le repli : la recherche complète dans le catalogue. */
  versLeCatalogue: () => void;
}

export function useRecherche(langue: Langue, aller: (href: string) => void): Recherche {
  const [terme, setTerme] = useState('');
  const [reponse, setReponse] = useState<ReponseRecherche | null>(null);
  const [charge, setCharge] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);
  const enVol = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = terme.trim();
    if (t.length < LONGUEUR_MINIMALE) {
      enVol.current?.abort();
      setReponse(null);
      setCharge(false);
      return;
    }

    setCharge(true);
    const minuterie = setTimeout(() => {
      enVol.current?.abort();
      const controleur = new AbortController();
      enVol.current = controleur;

      fetch(`/api/recherche?q=${encodeURIComponent(t)}&langue=${langue}`, {
        signal: controleur.signal,
      })
        .then((r) => (r.ok ? (r.json() as Promise<ReponseRecherche>) : null))
        .then((data) => {
          // La garde contre la réponse en retard : elle ne vaut que pour le
          // terme qui l'a demandée.
          if (!data || data.q !== t) return;
          setReponse(data);
          setActif(-1);
          setCharge(false);
        })
        .catch(() => {
          // Une requête annulée n'est pas une panne : c'est le comportement
          // normal dès qu'on tape une lettre de plus. On ne vide donc pas la
          // liste, sinon elle clignoterait à chaque frappe.
          if (!controleur.signal.aborted) setCharge(false);
        });
    }, REBOND_MS);

    return () => clearTimeout(minuterie);
  }, [terme, langue]);

  const plat = useMemo(
    () => reponse?.groupes.flatMap((g) => g.resultats) ?? [],
    [reponse],
  );

  const adresse = useCallback(
    (r: ResultatRecherche) =>
      // Un seul href arrive déjà complet : celui d'un casino, qui sort par
      // `/go/…`, hors du segment de langue. Le préfixer le casserait.
      r.categorie === 'casino' ? r.href : cheminPublic(r.href, langue),
    [langue],
  );

  const fermer = useCallback(() => {
    setOuvert(false);
    setActif(-1);
  }, []);

  const ouvrir = useCallback(
    (r: ResultatRecherche) => {
      fermer();
      aller(adresse(r));
    },
    [adresse, aller, fermer],
  );

  const versLeCatalogue = useCallback(() => {
    fermer();
    aller(cheminPublic(`/catalogue?q=${encodeURIComponent(terme.trim())}`, langue));
  }, [aller, fermer, langue, terme]);

  const saisir = useCallback((valeur: string) => {
    setTerme(valeur);
    setOuvert(true);
  }, []);

  const auClavier = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        fermer();
        return;
      }
      if (e.key === 'Enter') {
        // Sans ligne sélectionnée, Entrée garde son sens de formulaire : la
        // recherche complète dans le catalogue. Quelqu'un qui tape un titre et
        // valide sans regarder la liste ne doit pas tomber dans le vide.
        e.preventDefault();
        if (actif >= 0 && plat[actif]) ouvrir(plat[actif]);
        else if (terme.trim().length >= LONGUEUR_MINIMALE) versLeCatalogue();
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      if (plat.length === 0) return;

      // La flèche ne doit pas déplacer le curseur dans le texte saisi pendant
      // qu'elle parcourt la liste : les deux se disputeraient la touche.
      e.preventDefault();
      setOuvert(true);
      setActif((i) => deplacer(i, e.key === 'ArrowDown' ? 1 : -1, plat.length));
    },
    [actif, fermer, ouvrir, plat, terme, versLeCatalogue],
  );

  const idDeLigne = useCallback((cle: string) => `recherche-${cle.replace(/[^a-z0-9]/gi, '-')}`, []);
  const idActif = actif >= 0 && plat[actif] ? idDeLigne(plat[actif].cle) : null;

  return {
    terme,
    saisir,
    ouvert: ouvert && terme.trim().length >= LONGUEUR_MINIMALE,
    fermer,
    charge,
    reponse,
    plat,
    actif,
    idActif,
    idDeLigne,
    auClavier,
    adresse,
    ouvrir,
    versLeCatalogue,
  };
}
