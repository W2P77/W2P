'use client';

import { useEffect, useState } from 'react';
import { lireMesJeux, basculerJeu } from './MesJeux';
import type { JeuVignette } from './CarteJeu';

/**
 * L'étoile d'enregistrement posée sur une vignette.
 *
 * ── Pourquoi elle n'est pas dans le lien ──────────────────────────────────
 *
 * La vignette entière est un `<a>`. Un `<button>` à l'intérieur d'un lien est
 * invalide, et surtout le clic déclencherait la navigation avant d'atteindre
 * le bouton — l'étoile serait inutilisable. Elle est donc posée **par-dessus**
 * la carte, en dehors du lien.
 */
export function EtoileEnregistrer({ jeu }: { jeu: JeuVignette }) {
  const [enregistre, setEnregistre] = useState<boolean | null>(null);

  useEffect(() => {
    setEnregistre(lireMesJeux().some((j) => j.slug === jeu.slug));
  }, [jeu.slug]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setEnregistre(basculerJeu(jeu));
      }}
      aria-pressed={enregistre ?? false}
      aria-label={enregistre ? `Remove ${jeu.nom} from my games` : `Save ${jeu.nom}`}
      className={`absolute right-1.5 top-1.5 z-10 grid h-7 w-7 place-items-center rounded-full border text-[13px] backdrop-blur transition ${
        enregistre
          ? 'border-neon-magenta bg-neon-magenta/25 text-white'
          : 'border-white/25 bg-black/50 text-white/70 hover:border-neon-magenta hover:text-white'
      }`}
    >
      {enregistre ? '★' : '☆'}
    </button>
  );
}
