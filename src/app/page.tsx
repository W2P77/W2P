/**
 * Accueil provisoire.
 *
 * Volontairement minimal : la charte et la chaîne de build se valident sur une
 * page, pas sur un site. Le contenu viendra du catalogue.
 */
export default function Accueil() {
  return (
    <main className="min-h-screen bg-grille-neon bg-grille">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-neon-cyan">
          where2play.info
        </p>
        <h1 className="mb-6 font-titre text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
          Le catalogue qui dit
          <br />
          <span className="text-neon-magenta">d’où vient le chiffre</span>
        </h1>
        <p className="max-w-xl text-texte-doux">
          RTP, volatilité, gain maximum, démos. Chaque donnée porte son niveau de
          vérification — studio, agrégateur, ou non vérifié.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { titre: 'Vérifié studio', detail: 'Chiffre publié par l’éditeur', classe: 'liseré-cyan' },
            { titre: 'À confirmer', detail: 'Source secondaire, non recoupée', classe: '' },
            { titre: 'Non vérifié', detail: 'Aucune source fiable à ce jour', classe: '' },
          ].map((c) => (
            <div key={c.titre} className={`panneau p-5 ${c.classe}`}>
              <p className="font-semibold">{c.titre}</p>
              <p className="mt-1 text-sm text-texte-doux">{c.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
