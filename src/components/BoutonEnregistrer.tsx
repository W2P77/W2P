'use client';

import { useEffect, useState } from 'react';
import { lireMesJeux, basculerJeu } from './MesJeux';
import type { JeuVignette } from './CarteJeu';

/**
 * Le bouton qui met un jeu de côté.
 *
 * ── Pourquoi il existe ────────────────────────────────────────────────────
 *
 * La page « My games » lisait une liste que rien ne remplissait : elle
 * n'aurait jamais pu afficher autre chose que son message vide. Une
 * fonctionnalité à moitié posée coûte la confiance du visiteur qui l'essaie.
 *
 * L'état est lu après le montage, jamais au rendu serveur : `localStorage`
 * n'existe pas côté serveur, et supposer une valeur produirait un bouton qui
 * change d'apparence sous les doigts au premier chargement.
 */
export function BoutonEnregistrer({ jeu }: { jeu: JeuVignette }) {
  const [enregistre, setEnregistre] = useState<boolean | null>(null);

  useEffect(() => {
    setEnregistre(lireMesJeux().some((j) => j.slug === jeu.slug));
  }, [jeu.slug]);

  return (
    <button
      type="button"
      onClick={() => setEnregistre(basculerJeu(jeu))}
      aria-pressed={enregistre ?? false}
      className={`rounded-full border px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] transition ${
        enregistre
          ? 'border-neon-magenta bg-neon-magenta/15 text-white'
          : 'border-fond-bordure text-texte-doux hover:border-neon-magenta hover:text-white'
      }`}
    >
      {enregistre ? '★ Saved' : '☆ Save this game'}
    </button>
  );
}
