# Plan d'exécution du pilote ArtisanConnect

_Période visée : tests du 28 septembre au 4 octobre 2026; pilote contrôlé du 5 au 11 octobre 2026._

Objectif : vérifier les parcours essentiels, préparer un premier groupe d'artisans réels et lancer un pilote limité. Ce plan complète [FICHE_TEST_PILOTE.md](./FICHE_TEST_PILOTE.md) et [PILOT_LAUNCH_CHECKLIST.md](./PILOT_LAUNCH_CHECKLIST.md); il ne les remplace pas.

## État et précautions

- Les offres actuellement en base seront marquées `isDemo=true` par la migration `1760300000000-catalog-demo-flags.ts`; elles ne sont pas supprimées.
- Le Render de production doit rester avec `DEMO_MODE=true` et `NEXT_PUBLIC_DEMO_MODE=true` pendant la préparation.
- Les tests qui doivent créer des commandes ou des demandes doivent utiliser une base locale ou de préproduction isolée, avec les deux variables de mode démo à `false`.
- La migration ne s'exécute que si `DB_SYNCHRONIZE=false`; cette condition est déjà configurée pour Render, mais doit être vérifiée dans l'environnement de test.
- Toute offre créée lorsque `DEMO_MODE=true` est enregistrée comme démo. Créer les offres réelles dans l'environnement pilote après la bascule, jamais dans la base de test.
- MoMo et Orange Money restent en sandbox/mock; le transporteur reste simulé. Les transactions réelles du pilote doivent utiliser les espèces et un processus de remise convenu.
- Le dernier `npx.cmd tsc --noEmit` frontend a remonté environ 184 diagnostics, notamment des clés de traduction non reconnues. Résoudre ce blocage avant un déploiement du frontend.
- Le modèle Render actuel ne crée pas de base de préproduction distincte. Ne pas utiliser la base de production pour les essais avec les commandes activées.

## Semaine 1 — tests et préparation

### Lundi 28 septembre — environnement et migration

- [ ] Confirmer l'environnement de test et son URL.
- [ ] Confirmer que sa base est distincte de la base Render de production; faire une sauvegarde avant toute migration.
- [ ] Vérifier `DB_SYNCHRONIZE=false`, puis démarrer le backend afin d'exécuter les migrations.
- [ ] Vérifier que les annonces et services déjà présents portent `isDemo=true`.
- [ ] Passer `DEMO_MODE=false` et `NEXT_PUBLIC_DEMO_MODE=false` dans l'environnement isolé uniquement.
- [ ] Vérifier que les offres démo ne sont plus retournées par les routes publiques.
- [ ] Créer une annonce et un service de test dans cette base isolée; confirmer qu'ils sont visibles et peuvent être utilisés dans les scénarios.

### Mardi 29 et mercredi 30 septembre — tests fonctionnels

- [ ] Exécuter les scénarios détaillés de [FICHE_TEST_PILOTE.md](./FICHE_TEST_PILOTE.md) avec des comptes client, artisan et administrateur distincts.
- [ ] Tester inscription, connexion, vérification de compte et profil artisan.
- [ ] Créer et publier une boutique, une annonce produit et un service; vérifier la validation artisan.
- [ ] Tester recherche, commande produit en espèces, demande de service, réponse/devis, messagerie et avis après clôture.
- [ ] Tester annulation, indisponibilité, remboursement manuel et procédure d'escalade.
- [ ] Vérifier que l'environnement de test ne contacte pas de vrais artisans et n'utilise pas de vrais moyens de paiement mobiles.

### Jeudi 1 et vendredi 2 octobre — représentant et offre réelle

- [ ] Faire exécuter au représentant, sans aide, les parcours terrain : créer/compléter une boutique, publier une offre, répondre à une demande et expliquer les paiements disponibles.
- [ ] Noter les incompréhensions et les blocages; corriger les défauts bloquants seulement.
- [ ] Commencer la prospection avant la semaine du lancement; sélectionner une ville et deux ou trois métiers.
- [ ] Recueillir avec l'accord des artisans les informations nécessaires : nom d'activité, métier, zone, coordonnées, photos réelles, prix/délais et disponibilité.
- [ ] Faire valider chaque fiche avant publication; ne pas réutiliser les comptes, photos ou avis fictifs.

### Samedi 3 et dimanche 4 octobre — décision Go / No-Go

- [ ] Relire la [checklist de lancement](./PILOT_LAUNCH_CHECKLIST.md) et la fiche de tests; consigner les résultats et les incidents ouverts.
- [ ] Confirmer une sauvegarde et une procédure de retour arrière.
- [ ] Vérifier que les mentions et conditions applicables (confidentialité, vente, annulation/remboursement et livraison) sont prêtes avant toute ouverture publique.
- [ ] Décider GO pilote contrôlé ou NO-GO; reporter si les offres réelles, les tests critiques ou les informations légales manquent.

## Semaine 2 — pilote contrôlé

### Du 5 au 11 octobre

- [ ] Ouvrir le pilote à un petit groupe connu, dans la ville et les métiers retenus.
- [ ] Viser comme première cohorte environ 5 à 10 artisans réellement actifs, avec au moins une offre vérifiée chacun; ajuster la cible selon le recrutement réel.
- [ ] Après vérification des données et du feu vert, créer les offres réelles dans la base pilote avec les deux variables de mode démo à `false`.
- [ ] Garder MoMo, Orange Money et le transporteur présentés comme simulés; proposer les espèces/remises convenues pour les transactions réelles.
- [ ] Affecter un responsable aux demandes sans réponse, annulations, incidents de livraison et questions de paiement.
- [ ] Faire un point quotidien avec le représentant; corriger les incidents P0 avant d'élargir le groupe.

## Critères de lancement

Le GO pilote est accordé uniquement si :

- [ ] La migration et le filtrage des offres démo ont été vérifiés sur une base isolée.
- [ ] Les offres fictives ne réapparaissent pas lorsque l'API est vide ou indisponible.
- [ ] Les offres visibles pour les clients sont réelles, exactes et publiées avec l'accord des artisans.
- [ ] Le représentant réalise les parcours prioritaires sans assistance.
- [ ] Le build frontend passe; les erreurs TypeScript connues sont résolues.
- [ ] Les moyens de paiement, la livraison, les annulations et le contact support sont expliqués sans ambiguïté.
- [ ] Les conditions légales et la protection des données sont accessibles.

## Suivi quotidien

| Date | Artisans/offres réels actifs | Demandes reçues | Réponses reçues | Commandes/prestations terminées | Incidents et responsable |
|---|---:|---:|---:|---:|---|
| 5 octobre |  |  |  |  |  |
| 6 octobre |  |  |  |  |  |
| 7 octobre |  |  |  |  |  |
| 8 octobre |  |  |  |  |  |
| 9 octobre |  |  |  |  |  |
| 10 octobre |  |  |  |  |  |
| 11 octobre |  |  |  |  |  |

## Décision finale

- Décision : ☐ GO pilote contrôlé  ☐ NO-GO / report
- Ville et métiers retenus : __________________________________________
- Nombre d'artisans confirmés : _______________________________________
- Bloquants ouverts : __________________________________________________
- Responsable du suivi pilote : ________________________________________
