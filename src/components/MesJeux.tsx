'use client';

import { useEffect, useState } from 'react';
import { CarteJeu, type JeuVignette } from './CarteJeu';
import { Lien } from '@/components/Lien';

/**
 * Les jeux mis de côté par le visiteur.
 *
 * ── Pourquoi sans compte ──────────────────────────────────────────────────
 *
 * « Account » promettait d'ordinaire une inscription. Un catalogue n'a aucune
 * raison de savoir qui vous êtes : le seul besoin réel est de retrouver un jeu
 * repéré la veille. `localStorage` y répond sans collecter une adresse, sans
 * mot de passe à gérer, sans données à protéger.
 *
 * La limite est assumée et écrite à l'écran : la liste ne suit pas d'un
 * appareil à l'autre.
 */
const CLE = 'w2p:mes-jeux';

export function lireMesJeux(): JeuVignette[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(CLE) ?? '[]');
  } catch {
    return [];
  }
}

export function basculerJeu(jeu: JeuVignette): boolean {
  const liste = lireMesJeux();
  const existe = liste.some((j) => j.slug === jeu.slug);
  const suite = existe ? liste.filter((j) => j.slug !== jeu.slug) : [...liste, jeu];
  try {
    localStorage.setItem(CLE, JSON.stringify(suite));
  } catch {
    // Stockage refusé (navigation privée) : le geste échoue sans casser la page.
  }
  return !existe;
}

export function MesJeux() {
  const [jeux, setJeux] = useState<JeuVignette[] | null>(null);

  // Lu après le montage : `localStorage` n'existe pas au rendu serveur, et
  // lire avant produirait une différence d'hydratation.
  useEffect(() => setJeux(lireMesJeux()), []);

  if (jeux === null) {
    return <p className="font-mono text-[12px] text-texte-faible">Loading…</p>;
  }

  if (jeux.length === 0) {
    return (
      <div className="panneau p-8 text-center">
        <p className="text-[14px] text-texte-doux">You have not saved any game yet.</p>
        <Lien href="/catalogue" className="tube tube-cyan mt-5 inline-block">
          Browse the catalogue
        </Lien>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {jeux.map((j, i) => (
        <CarteJeu key={j.slug} jeu={j} index={i} />
      ))}
    </div>
  );
}
