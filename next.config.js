/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Même contrainte que BetsRank : le quota d'optimisation d'images Vercel est
  // un poste de coût réel. Les visuels sont pré-dimensionnés à la source, donc
  // `sizes` et `quality` de next/image seront inertes ici aussi.
  images: { unoptimized: true },
};
module.exports = nextConfig;
