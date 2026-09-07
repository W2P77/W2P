/**
 * Le bouton d'accès rapide, en bas à droite.
 *
 * Sur un catalogue, la question qui revient est toujours la même : « où est le
 * jeu que je cherche ». Ce bouton ramène à la recherche depuis n'importe quelle
 * page, sans remonter en haut — c'est le geste le plus fréquent, autant qu'il
 * soit toujours à portée de pouce.
 */
export function BoutonFlottant() {
  return (
    <a
      href="/catalogue"
      aria-label="Search the catalogue"
      className="fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full border-2 border-neon-cyan bg-fond-panneau text-lg text-neon-cyan transition-all hover:bg-neon-cyan/15"
      style={{ boxShadow: '0 0 6px rgba(34,224,255,0.8), 0 0 18px rgba(34,224,255,0.45)' }}
    >
      ⌕
    </a>
  );
}
