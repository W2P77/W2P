import type { Config } from 'tailwindcss';

/**
 * La charte de where2play, en jetons.
 *
 * Un catalogue est un site qu'on parcourt vite : la lisibilité prime sur
 * l'effet. Le néon sert donc d'accent — bordures, halos, éléments actifs — et
 * jamais de fond de texte. Les valeurs vivent ici et nulle part ailleurs :
 * une couleur écrite en dur dans un composant est une couleur qu'on ne peut
 * plus changer.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fond: {
          DEFAULT: '#07050f',
          panneau: '#0f0a1d',
          carte: '#150e26',
          bordure: '#2a1f46',
        },
        neon: {
          magenta: '#ff2fd0',
          cyan: '#22e0ff',
          violet: '#8b5cf6',
        },
        texte: {
          DEFAULT: '#f3eaff',
          doux: '#a99ec4',
          faible: '#6f6590',
        },
        note: '#ffc247',
      },
      fontFamily: {
        titre: ['var(--police-titre)', 'system-ui', 'sans-serif'],
        corps: ['var(--police-corps)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-magenta': '0 0 12px rgba(255,47,208,0.45), 0 0 32px rgba(255,47,208,0.18)',
        'neon-cyan': '0 0 12px rgba(34,224,255,0.45), 0 0 32px rgba(34,224,255,0.18)',
        carte: '0 8px 28px rgba(0,0,0,0.55)',
      },
      backgroundImage: {
        'grille-neon':
          'linear-gradient(rgba(139,92,246,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.07) 1px, transparent 1px)',
      },
      backgroundSize: { grille: '44px 44px' },
    },
  },
  plugins: [],
};

export default config;
