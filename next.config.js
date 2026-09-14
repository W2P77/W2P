/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Même contrainte que BetsRank : le quota d'optimisation d'images Vercel est
  // un poste de coût réel. Les visuels sont pré-dimensionnés à la source, donc
  // `sizes` et `quality` de next/image seront inertes ici aussi.
  images: { unoptimized: true },

  /**
   * Les fiches en double, redirigées vers celle qu'on garde.
   *
   * ── Pourquoi une 301 et pas une suppression ───────────────────────────
   *
   * Tant que rien n'était indexé, retirer une fiche en double ne coûtait
   * rien. Depuis la soumission à Search Console, le 12/09/2026, une URL
   * supprimée devient une 404 que Google met des semaines à digérer — alors
   * qu'une 301 transmet à la fiche gardée le peu d'autorité déjà acquis.
   *
   * `east-vs-west` et `east-coast-vs-west-coast` sont le même jeu Nolimit
   * City sur le même lanceur : mêmes captures image pour image, même RTP
   * 96,04, même plafond 30 618×, capturés à deux minutes d'écart. On garde le
   * premier par ordre de slug, comme le veut la règle des doublons du projet,
   * et c'est aussi le seul des deux à porter grille, volatilité et mécaniques.
   */
  async redirects() {
    const doublons = [['east-vs-west', 'east-coast-vs-west-coast']];
    return doublons.flatMap(([mort, garde]) =>
      ['en', 'fr', 'de'].map((langue) => ({
        source: `/${langue}/slot/nolimit-city/${mort}`,
        destination: `/${langue}/slot/nolimit-city/${garde}`,
        permanent: true,
      })),
    );
  },
};
module.exports = nextConfig;
