# Checklist indexation moteurs de recherche

## URLs publiques

Site : https://artisanconnectcm.info/
Sitemap : https://artisanconnectcm.info/sitemap.xml
Robots : https://artisanconnectcm.info/robots.txt

## Avant soumission

1. Verifier que le site repond en HTTPS sans erreur certificat.
2. Verifier que `NEXT_PUBLIC_SITE_URL=https://artisanconnectcm.info` est configure sur le frontend deploye.
3. Verifier que `robots.txt` autorise les pages publiques.
4. Verifier que `sitemap.xml` liste les pages publiques et les articles de blog.
5. Verifier que les pages privees restent non indexees : admin, dashboard, messages, notifications, commandes, paiement.
6. Corriger le certificat de tout sous-domaine public utilise dans les e-mails, notamment `r.mail.artisanconnectcm.info` si les liens de tracking e-mail l'utilisent.

## Google Search Console

1. Aller sur https://search.google.com/search-console
2. Ajouter une propriete de type Domaine : `artisanconnectcm.info`.
3. Verifier le domaine par enregistrement DNS TXT.
4. Soumettre le sitemap : `https://artisanconnectcm.info/sitemap.xml`.
5. Utiliser Inspection d'URL sur `https://artisanconnectcm.info/`.
6. Cliquer sur Demander une indexation.

## Bing Webmaster Tools

1. Aller sur https://www.bing.com/webmasters
2. Ajouter `https://artisanconnectcm.info/`.
3. Importer depuis Google Search Console ou verifier par DNS.
4. Soumettre `https://artisanconnectcm.info/sitemap.xml`.

## Controle apres soumission

- Tester `site:artisanconnectcm.info` dans Google apres quelques jours.
- Surveiller les erreurs d'exploration dans Search Console.
- Verifier les pages exclues volontairement par `robots.txt`.
- Ajouter progressivement des backlinks fiables : profils sociaux, partenaires, annuaires institutionnels, articles de lancement.

## Notes contenu

Les articles de blog existants sont inclus dans le sitemap et aident l'indexation longue traine : artisanat Cameroun, Orange Money, livraison, formalisation, cooperatives et foires artisanales.
