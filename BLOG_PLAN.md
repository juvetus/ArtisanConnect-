# Blog ArtisanConnect

## Objectif

Le blog doit attirer des clients et des artisans camerounais depuis les moteurs de recherche, puis les ramener vers le catalogue, les services et les ressources de la plateforme. Le ton est pratique, local et crédible : prix en FCFA, villes camerounaises, moyens de paiement réellement disponibles et distinction entre artisan individuel et coopérative.

## Structure initiale

Routes disponibles :

- `/blog` : page d’accueil éditoriale, catégories, date, temps de lecture et liens vers les articles.
- `/blog/[slug]` : article SEO avec titre, résumé, auteur, date, sections et mots-clés.
- `/admin/blog` : route réservée au futur tableau de bord, à ajouter lorsque la publication en base sera nécessaire.

Le contenu de démarrage est dans `frontend/src/lib/blog.ts`. Chaque article possède déjà un contrat stable :

```ts
{
  slug,
  category: { fr, en },
  title: { fr, en },
  excerpt: { fr, en },
  author,
  publishedAt,
  readingTime,
  keywords,
  sections: { fr, en }
}
```

Cette forme permet de commencer sans base de données et de migrer ensuite vers une API sans modifier les composants d’affichage.

## Les quatorze premiers articles

| Slug | Titre SEO principal | Intention de recherche |
| --- | --- | --- |
| `acheter-artisanat-local-cameroun-guide` | Acheter de l’artisanat local au Cameroun : le guide pratique | Trouver et commander une création locale avec confiance |
| `vendre-artisanat-en-ligne-cameroun` | Vendre son artisanat en ligne au Cameroun : 7 étapes pour démarrer | Aider un artisan à lancer sa boutique |
| `orange-money-commande-artisan-cameroun` | Orange Money au Cameroun : payer une commande artisanale en toute confiance | Rassurer sur le paiement mobile et la traçabilité |
| `formaliser-atelier-artisan-cameroun` | Comment formaliser son atelier artisanal au Cameroun : les premiers repères | Informer les artisans qui veulent structurer leur activité |
| `femmes-artisanes-cooperatives-cameroun` | Femmes artisanes et coopératives au Cameroun : acheter pour soutenir un impact local | Expliquer l’impact local et les deux modèles de boutique |
| `fixer-prix-produit-artisanal-cameroun` | Comment fixer le prix d’un produit artisanal au Cameroun ? | Aider à calculer un prix viable en FCFA |
| `photos-produits-artisanaux-whatsapp-cameroun` | Photos de produits artisanaux : 6 astuces pour vendre sur WhatsApp au Cameroun | Améliorer la présentation et la conversion |
| `livrer-commandes-artisanales-douala-yaounde` | Livrer des commandes artisanales à Douala et Yaoundé : organiser un parcours fiable | Réduire les retards et les échecs de livraison |
| `cooperative-artisanale-catalogue-numerique-cameroun` | Coopérative artisanale au Cameroun : créer un catalogue numérique qui fonctionne | Aider les groupes à structurer leur présence en ligne |
| `appels-projets-artisans-cameroun-preparer-dossier` | Appels à projets pour artisans au Cameroun : préparer un dossier convaincant | Aider à répondre à des programmes d’accompagnement |
| `avantages-formalisation-artisan-cameroun` | Quels sont les avantages de la formalisation pour un artisan au Cameroun ? | Expliquer les appuis, démarches et droits liés à la formalisation |
| `participation-selection-recompenses-artisans-cameroun` | Participation et récompenses des artisans au Cameroun : comment être sélectionné ? | Expliquer l’inscription BCA, la sélection et les domaines concernés |
| `codepa-artisanat-africain-papea-cameroun` | CODEPA : comprendre le programme africain de développement et de promotion de l’artisanat | Présenter le CODEPA, le PAPEA et le calendrier MINPMEESA |
| `types-foires-artisanales-cameroun-siarc` | Types de foires artisanales au Cameroun : de la commune au SIARC | Expliquer le parcours de sélection et les salons internationaux |

Les titres sont volontairement descriptifs et contiennent les requêtes locales principales. Les prochains contenus pourront viser des requêtes plus précises par ville et par filière : vannerie à Bamenda, textile à Foumban, bijoux à Douala, décoration à Yaoundé, etc.

## Sources et indexation

Chaque article contient un tableau `sources` avec un libellé et une URL. La page publique rend ces références dans une section HTML `Sources et ressources`, avec des liens explicites vers les sites institutionnels. Les sources actuelles incluent notamment le MINPMEESA, l’OHADA, Orange Cameroun et ONU Femmes Cameroun.

Cette approche permet aux lecteurs de vérifier les informations et aux moteurs de comprendre le contexte documentaire de chaque article. Elle ne garantit pas à elle seule un classement dans Google : il faudra aussi publier le site, déclarer le domaine dans Google Search Console, fournir un sitemap et obtenir progressivement des liens entrants.

Les liens externes doivent être vérifiés avant chaque publication. Une source supprimée ou déplacée doit être remplacée, et un article ne doit pas présenter une information réglementaire ou tarifaire comme un conseil juridique définitif.

## Stack recommandée

### Maintenant : contenu local typé dans Next.js

- Next.js App Router déjà utilisé par la plateforme.
- TypeScript pour sécuriser les champs éditoriaux.
- `generateMetadata` pour le titre, la description, les mots-clés et l’URL canonique.
- Pages statiques générées pour les cinq slugs.
- Aucun CMS, serveur supplémentaire ou dépendance Markdown à déployer.

Cette option est la plus simple pour valider le trafic, le ton et les sujets avant de construire un back-office.

### Ensuite : API NestJS + PostgreSQL

Quand plusieurs personnes devront publier, ajouter les tables suivantes :

- `blog_posts` : `id`, `slug`, `status`, `publishedAt`, `authorId`, `coverImageUrl`, `createdAt`, `updatedAt`.
- `blog_post_translations` : `postId`, `language`, `title`, `excerpt`, `content`, `seoTitle`, `seoDescription`.
- `blog_categories` : `id`, `slug`, `nameFr`, `nameEn`.
- `blog_post_categories` : relation article/catégorie.

Le backend pourra exposer :

- `GET /blog/posts?status=published` pour le site public ;
- `GET /blog/posts/:slug` pour une page ;
- `POST /admin/blog/posts` pour créer un brouillon ;
- `PATCH /admin/blog/posts/:id` pour modifier ;
- `PATCH /admin/blog/posts/:id/status` pour publier, archiver ou remettre en brouillon ;
- `DELETE /admin/blog/posts/:id` pour supprimer.

Le statut conseillé est `draft`, `published` ou `archived`. Une publication devrait conserver `publishedAt`, l’auteur et un historique minimal des modifications.

## Tableau de bord à venir

Le dashboard devra commencer par quatre vues simples :

1. **Liste** : recherche, filtre par statut et pagination.
2. **Éditeur** : titre FR/EN, slug, résumé, contenu par sections, catégorie, image, mots-clés et date de publication.
3. **Prévisualisation** : aperçu public avant publication.
4. **Actions** : enregistrer en brouillon, publier, archiver.

Pour une première version, un éditeur en sections structurées est préférable à un éditeur riche complexe : il réduit les problèmes de HTML non maîtrisé, facilite le rendu responsive et garde une migration simple vers une API. Un champ Markdown ou un éditeur riche pourra être ajouté après validation du workflow de publication.

## Règles éditoriales SEO

- Un seul H1 par article, correspondant au titre principal.
- Un slug court, stable et sans accents.
- Un résumé de 140 à 160 caractères lorsque possible.
- Des exemples locaux vérifiables, sans promesse irréaliste sur les revenus ou les délais.
- Liens internes vers le catalogue, les services, la formalisation et les boutiques concernées.
- Image de couverture avec texte alternatif descriptif dès que la médiathèque sera branchée.
- Traduction anglaise éditoriale, pas une traduction automatique visible sans relecture.