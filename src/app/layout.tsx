/**
 * Le layout racine ne rend plus ni `html` ni `body`.
 *
 * Next impose que ces balises soient rendues par un layout — mais l'attribut
 * `lang` doit varier avec la langue de la page, et la racine ne connaît pas
 * cette langue : elle est dans le segment `[langue]`. C'est donc son layout
 * qui les porte, fontes et métadonnées comprises.
 *
 * Ce fichier reste nécessaire : sans layout racine, Next refuse de démarrer.
 */
export default function LayoutRacine({ children }: { children: React.ReactNode }) {
  return children;
}
