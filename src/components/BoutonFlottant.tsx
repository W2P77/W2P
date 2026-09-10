import { Lien } from '@/components/Lien';
/**
 * Le bouton flottant d'aide.
 *
 * Sur la maquette c'est un cadre néon biseauté ouvert — les traits ne se
 * rejoignent pas aux angles. C'est ce qui le distingue d'une pastille ronde
 * ordinaire, et ce qui le rattache au reste de la charte.
 */
export function BoutonFlottant() {
  return (
    <Lien
      href="/guides"
      className="group fixed bottom-6 right-6 z-40 hidden h-14 w-14 place-items-center sm:grid"
      aria-label="Read the guides"
    >
      <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full" fill="none" aria-hidden>
        {/* Cadre ouvert : quatre équerres, pas un rectangle. */}
        <path
          d="M4 18 V8 L14 8 M42 8 H52 V18 M52 38 V48 H42 M14 48 H4 V38"
          stroke="#2fd8f5"
          strokeWidth="2"
          className="transition-[stroke] group-hover:stroke-[#f13fdc]"
        />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="relative h-6 w-6 text-neon-cyan transition-colors group-hover:text-neon-magenta"
        fill="none"
        aria-hidden
      >
        <path
          d="M4 5h16v10H9l-5 4V5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    </Lien>
  );
}
