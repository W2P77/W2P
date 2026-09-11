import type { Config } from 'tailwindcss';

/**
 * La charte de where2spin, en jetons.
 *
 * ── Ce qui fait l'identité, et qu'on ne peut pas obtenir avec des arrondis ─
 *
 * Toute la charte tient sur une découpe : les panneaux sont **biseautés à
 * 45°** en haut à gauche et en bas à droite, et un liseré néon suit la coupe.
 * Un `border-radius`, même généreux, donne un site sombre ordinaire ; c'est
 * l'angle coupé qui donne l'air de panneau de contrôle. La découpe vit donc
 * dans `globals.css` (`.biseau`), pas ici — Tailwind ne sait pas générer un
 * `clip-path` paramétré.
 *
 * ── L'orange n'est pas décoratif ──────────────────────────────────────────
 *
 * Deux néons se lisent comme un dégradé ; trois se lisent comme un circuit.
 * L'orange ne sert jamais à un état ni à une donnée — uniquement aux tracés —
 * ce qui le distingue du cyan (action) et du magenta (actif, sélection).
 *
 * Les valeurs vivent ici et nulle part ailleurs : une couleur écrite en dur
 * dans un composant est une couleur qu'on ne peut plus changer.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fond: {
          DEFAULT: '#070a14',
          panneau: '#0d1121',
          carte: '#141a2e',
          bordure: '#212a47',
        },
        neon: {
          magenta: '#f13fdc',
          cyan: '#2fd8f5',
          violet: '#8b5cf6',
          /* Réservé aux tracés de circuit. Jamais un état, jamais une donnée. */
          orange: '#ff9d4d',
        },
        texte: {
          DEFAULT: '#eef2ff',
          doux: '#9aa5c8',
          faible: '#65708f',
        },
        note: '#ffc247',
      },
      fontFamily: {
        titre: ['var(--police-titre)', 'Impact', 'sans-serif'],
        ui: ['var(--police-ui)', 'system-ui', 'sans-serif'],
        corps: ['var(--police-corps)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-magenta': '0 0 12px rgba(241,63,220,0.45), 0 0 32px rgba(241,63,220,0.18)',
        'neon-cyan': '0 0 12px rgba(47,216,245,0.45), 0 0 32px rgba(47,216,245,0.18)',
        carte: '0 8px 28px rgba(0,0,0,0.55)',
      },
      dropShadow: {
        /* `box-shadow` ignore un `clip-path` : le halo d'un panneau biseauté
           doit passer par un filtre, sinon il déborde en rectangle. */
        'lueur-cyan': ['0 0 5px rgba(47,216,245,0.55)', '0 0 16px rgba(47,216,245,0.25)'],
        'lueur-magenta': ['0 0 5px rgba(241,63,220,0.55)', '0 0 16px rgba(241,63,220,0.25)'],
      },
      backgroundImage: {
        'grille-neon':
          'linear-gradient(rgba(139,92,246,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.07) 1px, transparent 1px)',
      },
      backgroundSize: { grille: '44px 44px' },
      keyframes: {
        /* La respiration du logo sur l'écran de sortie : une seconde et demie
           d'attente sans rien qui bouge donne l'impression d'une page figée. */
        respiration: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.9' },
        },
      },
      animation: { respiration: 'respiration 2s ease-in-out infinite' },
    },
  },
  plugins: [],
};

export default config;
