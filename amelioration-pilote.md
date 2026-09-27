# Améliorations prioritaires du pilote ArtisanConnect

_Synthèse opérationnelle revue le 27 septembre 2026._

Les constats sur les données de production, les volumes et les parcours doivent être revalidés sur l'environnement pilote avant d'être annoncés comme des faits.

## Cap du pilote

La priorité n'est pas d'activer toutes les fonctionnalités, mais de prouver qu'un client trouve un artisan adapté, obtient une réponse et peut mener une demande jusqu'à une prestation ou une commande terminée.

Commencer dans une zone géographique et quelques métiers choisis selon l'offre réelle disponible. La liquidité, la qualité des profils et la rapidité de réponse compteront davantage qu'un grand nombre de catégories ou de pages.

## Priorité 0 — avant l'ouverture au public

### 1. Distinguer clairement les profils de démonstration

L'accueil affiche des profils de démonstration. Le texte les présente comme un aperçu pour le pilote, mais les cartes ne portent pas de mention individuelle explicite.

**Action :** afficher un badge visible « Profil de démonstration — non disponible » sur chaque profil fictif, ou retirer ces profils de la zone des artisans actifs dès que les profils réels suffisent.

**Terminé quand :** un visiteur ne peut pas confondre un profil fictif avec un artisan joignable et proposant une offre réelle.

### 2. Vérifier les informations légales et la protection des données

La plateforme traite des coordonnées, des messages, des dossiers KYC et des paiements. Je n'ai pas repéré de pages légales évidentes dans les routes publiques examinées.

**Action :** confirmer et publier les documents applicables (mentions légales, confidentialité, conditions d'utilisation et de vente, annulation/remboursement, cookies si nécessaire) et les relier depuis le pied de page. Préciser les usages et la conservation des pièces KYC.

**Terminé quand :** chaque collecte et chaque étape de commande renvoie vers une information accessible et cohérente avec le fonctionnement réel.

**État au 27 septembre 2026 :** les routes de brouillon bilingues `/mentions-legales`, `/confidentialite` et `/conditions` sont créées et reliées au pied de page. Elles ne sont pas prêtes à publier : l’identité juridique, les coordonnées officielles, les durées de conservation, les règles de vente/remboursement et la validation juridique restent à fournir.

**Informations de projet communiquées :** entité exploitante envisagée **Tekou Digital**, nom commercial **ArtisanConnect**, création prévue le **15 octobre 2026**. La forme juridique reste à choisir entre SARL et SAS; ces informations ne doivent pas encore être présentées comme une immatriculation définitive.

**À faire avant toute publication définitive :**
- [ ] Renseigner la dénomination juridique complète et la forme de l’entité exploitante.
- [ ] Renseigner les numéros d’immatriculation et d’identification applicables (registre, NIU ou équivalent).
- [ ] Renseigner l’adresse complète du siège social.
- [ ] Nommer le responsable de publication et indiquer sa fonction.
- [ ] Fournir une adresse e-mail officielle pour les demandes juridiques et relatives aux données personnelles.
- [ ] Définir les durées de conservation par catégorie : comptes, pièces KYC, messages et pièces jointes, commandes/paiements, journaux, analytics et sauvegardes; préciser les règles de suppression ou d’archivage.
- [ ] Définir le processus de traitement des demandes d’accès, rectification et suppression : canal de contact, vérification du demandeur, responsable, délai cible et procédure d’escalade.
- [ ] Confirmer les prestataires, sous-traitants et régions de traitement réellement utilisés, ainsi que les éventuels transferts de données hors du pays.
- [ ] Rédiger les règles précises de vente et de formation d’une commande, frais/commissions, livraison, annulation, réclamation, litige et remboursement.
- [ ] Faire relire et valider les documents par un conseil compétent au regard de l’entité et des activités réellement exercées.
- [ ] Remplacer tous les champs entre crochets, renseigner la date d’entrée en vigueur et vérifier les liens depuis le pied de page.

**Blocage :** ne pas présenter les pages comme définitives ni ouvrir le pilote au public tant que ces tâches ne sont pas terminées et validées.

### 3. Contrôler la qualité des profils actifs

Une mauvaise catégorie ou une localisation inexacte dégrade la recherche, les mises en relation et la confiance. L'exemple « Plombier SUSIE / Poterie » cité dans l'analyse n'a pas été retrouvé dans les sources du dépôt ; il faut le vérifier dans les données actuellement servies avant de le traiter comme un incident confirmé.

**Action :** avant activation, vérifier métier, ville/quartier, moyens de contact, photos et disponibilité. Recontrôler en production l'exemple SUSIE et corriger la fiche si l'anomalie est toujours présente.

**Terminé quand :** chaque profil visible correspond à une activité réelle, avec une catégorie et une zone confirmées.

**Contrôle préventif ajouté :** le formulaire de publication sépare les catégories produit/service et le backend refuse désormais toute création ou modification d’annonce dont la catégorie est inconnue ou incompatible avec son type. Ce garde-fou empêche de nouvelles erreurs par l’API, mais ne corrige pas les offres déjà en base; leur validation et correction restent manuelles.

**Pré-audit local du 27 septembre 2026 :** lecture seule de l’API publique `localhost:3001`; ces observations ne décrivent pas nécessairement la production.
- 3 boutiques actives sont retournées. `JuvetShop` n’a ni ville ni quartier renseigné; sa zone doit être confirmée par son propriétaire.
- `Les Mains Solidaires` est active à Bangou/Mbete, mais sa fiche publique ne retourne aucune annonce ni aucun service. Confirmer qu’elle est encore active et qu’une offre réelle doit être publiée.
- `Test Boutique` semble être une fiche de test : elle publie `Iphone 29` et deux annonces intitulées `test`, toutes classées en vannerie. Ne pas les supprimer avant d’avoir confirmé qu’il s’agit bien de données fictives.
- L’annonce `APPLE iPhone 16 128 Go Sarcelle Reconditionné Très bon état` est également classée en vannerie; vérifier sa catégorie réelle et la conformité de cette offre avec le périmètre de la marketplace.
- Le catalogue services retourne `TEST` (couture, Gwladys Crèche), `Good` (menuiserie, Test Final) et `Création site Web` (développement web, Juvet Service). Confirmer les deux premières comme données de test ou obtenir la preuve qu’elles correspondent à de vraies prestations avant publication.
- Les lignes retournées par l’API locale portent `isDemo=false`; la migration de marquage n’est donc pas encore vérifiée sur cette base. L’exemple « Plombier SUSIE / Poterie » n’apparaît pas dans ce relevé.

**À faire :**
- [ ] Refaire ce contrôle après migration sur la base staging, puis sur la source de données de production avant toute bascule.
- [ ] Contacter les responsables de `JuvetShop`, `Les Mains Solidaires` et `Test Boutique` pour confirmer activité, ville/quartier, métiers et statut réel.
- [ ] Confirmer si les annonces `Iphone 29`, `APPLE iPhone 16...` et `test` sont réelles; corriger la catégorie ou les retirer via l’administration après validation, sans suppression SQL directe.
- [ ] Confirmer ou retirer les services `TEST` et `Good`; vérifier les photos, prix/délais, disponibilité et coordonnées dans l’espace autorisé, sans exposer les numéros dans un rapport public.
- [ ] Ne laisser visibles que les boutiques actives avec au moins une offre réelle, ou décider explicitement qu’une boutique sans offre reste présentée comme profil en constitution.

### 4. Décrire honnêtement les paiements et la livraison

Le texte produit distingue les transactions pilote en espèces des paiements MoMo et Orange Money encore en sandbox/mock. Ne pas présenter tous les paiements mobiles comme opérationnels.

**Action :** préciser, avant confirmation, les moyens actuellement disponibles, qui encaisse, les conditions de livraison, l'annulation et le remboursement. Mettre à jour ces textes dès que les intégrations réelles sont validées.

**Terminé quand :** le client sait exactement comment il paiera et comment sa commande lui sera remise avant de s'engager.

**État au 27 septembre 2026 :** les pages d’accueil, fonctionnement, checkout, historique de commande et paiement affichent désormais la différence entre espèces convenues, Mobile Money de test et transporteur simulé. Render expose `NEXT_PUBLIC_MOBILE_MONEY_MODE=test` et `NEXT_PUBLIC_CARRIER_MODE=simulation` pour la production et le staging. En production, `DEMO_MODE=true` bloque les commandes; sur staging, `DEMO_MODE=false` permet de tester le parcours, mais Mobile Money reste non réel et le transporteur simulé.

**À confirmer avant le GO pilote :**
- [ ] Confirmer que le pilote réel accepte uniquement les espèces à la remise tant qu’aucun moyen Mobile Money n’est passé en mode réel.
- [ ] Définir qui encaisse, qui confirme la réception et quelle preuve conserve chaque partie.
- [ ] Définir par offre le lieu, le coût, le délai et le responsable de la livraison; ne proposer un transporteur réel que lorsqu’un service et un tarif sont confirmés.
- [ ] Tester annulation, indisponibilité, réclamation et remboursement avec les comptes client, artisan et administrateur sur staging.
- [ ] Ne passer `NEXT_PUBLIC_MOBILE_MONEY_MODE` à `live` qu’après activation et validation réelle des intégrations correspondantes; redéployer ensuite le frontend.

**État au 27 septembre 2026 :** les interfaces distinguent maintenant le mode démonstration, le paiement en espèces convenu avec l’artisan, Mobile Money en test/sandbox et le transporteur simulé. Les variables publiques Render sont fixées à `test` pour Mobile Money et `simulation` pour le transporteur. Les modalités opérationnelles d’annulation, de livraison et de remboursement restent à confirmer avant le pilote.

## Priorité 1 — pendant le pilote

### 5. Concentrer l'offre et l'acquisition

**Action :** choisir une ville et deux ou trois métiers selon les artisans réellement mobilisables et les demandes clients observées. Recruter une cohorte limitée, accompagner la création des profils et obtenir des offres vérifiables avant d'élargir la couverture.

**Mesure :** artisans actifs avec une offre réelle, demandes auxquelles au moins un artisan répond, délai de première réponse et commandes/prestations terminées.

### 6. Tester les parcours complets de bout en bout

Les demandes de devis, commandes, avis vérifiés, annulations et mécanismes de remboursement ont déjà des implémentations dans le produit. Le travail pilote est de confirmer qu'ils fonctionnent clairement pour les utilisateurs et dans les conditions opérationnelles prévues.

**Action :** jouer régulièrement des scénarios client et artisan : recherche, demande ou commande, réponse, acceptation, paiement disponible, remise/livraison, clôture, avis, annulation et réclamation. Noter les blocages et attribuer chaque correction.

**Terminé quand :** les scénarios prioritaires sont testés avec des comptes distincts et une issue connue pour les échecs, retards et demandes sans artisan disponible.

**Résultats automatisés au 27 septembre 2026 :**
- 11 tests E2E passent sur une base PostgreSQL locale isolée `artisan_connect_e2e_serial`; ils n’utilisent pas la base applicative `artisan_connect`.
- Le parcours produit HTTP est testé de bout en bout : recherche publique → commande en espèces → décrément du stock → confirmation de remise par le vendeur → commande terminée → avis client vérifié.
- Le parcours service HTTP est testé de bout en bout : demande client → validation admin → devis artisan → acceptation client → acompte Mobile Money simulé → démarrage → livraison → acceptation client → solde simulé → avis vérifié.
- Les callbacks/webhooks MoMo et Orange Money, le suivi transporteur simulé et le rejet de webhooks non signés sont également couverts.
- 93 tests unitaires passent et le backend compile. Le SMTP est désactivé dans les E2E afin qu’aucun e-mail ne soit envoyé à un prestataire réel.
- Un défaut découvert par les E2E a été corrigé : le type PostgreSQL de `analytics_events.type` est maintenant déclaré explicitement. La fixture d’abonnement MoMo inclut aussi le slug obligatoire.

**Reste à tester manuellement avant le GO :**
- [ ] Le représentant réalise les parcours dans l’interface mobile et desktop sans assistance.
- [ ] Inscription, vérification e-mail/téléphone, réinitialisation de mot de passe et réception des e-mails avec un compte SMTP de test.
- [ ] Création et validation réelle d’une boutique, envoi des fichiers KYC et photos sur l’environnement staging.
- [ ] Annulation, absence de réponse, indisponibilité, réclamation et procédure de remboursement avec les personnes responsables.
- [ ] Compréhension par les utilisateurs des mentions « test/sandbox », du paiement en espèces et de la livraison simulée.
- [ ] Rejouer les E2E après application de la migration `isDemo` sur la base staging.

**Limite :** les E2E testent des requêtes HTTP NestJS contre une base isolée; ils ne remplacent pas les tests du parcours visuel dans le navigateur, les essais avec le représentant ou la validation des véritables configurations Render.

### 7. Expliquer les preuves de confiance déjà disponibles

La vérification progressive et les avis liés à une commande terminée existent déjà. Il faut éviter de traiter ces mécanismes comme une fonctionnalité à construire de zéro.

**Action :** expliquer simplement ce que signifient les niveaux de vérification, distinguer téléphone, profil/KYC et identité contrôlée, et afficher clairement qu'un avis provient d'une commande terminée. Ne pas promettre de contrôle qui n'a pas été effectué.

**État au 27 septembre 2026 :** la fiche publique présente une section bilingue repliable qui indique l’état des quatre contrôles (téléphone, boutique/KYC, identité, recommandé), détaille les critères « recommandé » et précise qu’un badge ne garantit ni la qualité future, ni la disponibilité, ni l’issue d’une transaction. Le bloc d’avis indique qu’un avis vérifié est associé à une commande ou prestation terminée. Contrôle navigateur local effectué en anglais; le texte français est aussi couvert par le build et les traductions.

**À valider avec les utilisateurs avant le GO :**
- [ ] Demander à un client test d’expliquer les différences entre téléphone confirmé, dossier de boutique contrôlé et identité vérifiée.
- [ ] Vérifier qu’il comprend les seuils du niveau « recommandé » et ne l’interprète pas comme une garantie.
- [ ] Tester sur téléphone l’ouverture et la lecture de l’explication des badges.
- [ ] Vérifier que chaque avis marqué « vérifié » correspond bien à une commande ou prestation terminée dans les données du pilote.

**État au 27 septembre 2026 :** la fiche publique d’une boutique présente désormais une explication dépliable des contrôles, accessible sur mobile, avec l’état de chaque étape et un avertissement indiquant qu’un badge ne garantit ni qualité future, ni disponibilité, ni résultat commercial. Les avis publics précisent qu’un avis vérifié est rattaché à une commande ou une prestation terminée.

**Critères actuellement calculés par le backend :** téléphone confirmé; profil/KYC lorsque la boutique est active et que les documents requis sont fournis; identité contrôlée manuellement; niveau « artisan recommandé » lorsque l’identité est contrôlée, avec au moins 5 ventes réussies, 3 avis vérifiés et une moyenne d’au moins 4,5/5.

**À valider pendant les tests représentant/client :**
- [ ] Demander à un utilisateur d’expliquer avec ses mots la différence entre téléphone confirmé, dossier de boutique contrôlé et identité contrôlée.
- [ ] Vérifier qu’il comprend que « recommandé » dépend des seuils indiqués et n’est pas une garantie de qualité ou de résultat.
- [ ] Vérifier sur mobile que l’explication des badges est trouvable et lisible sans survol.
- [ ] Vérifier qu’un avis affiché comme vérifié est bien rattaché à une commande ou prestation terminée et que les avis non vérifiés ne portent pas ce label.

### 8. Piloter avec un funnel mesurable

**Action :** suivre chaque semaine les recherches, consultations de profils/offres, demandes créées, réponses, devis acceptés, commandes terminées, avis et retours de clients. Pour chaque taux, conserver le numérateur et le dénominateur ; séparer les données réelles des données de démonstration.

**État au 27 septembre 2026 :** le funnel backend est implémenté et son affichage admin distingue les volumes réels des données démo et des historiques non classés. Les nouvelles écritures portent leur provenance (`isDemo`) ; les anciennes lignes restent volontairement non classées et sont exclues des indicateurs réels tant qu’elles n’ont pas été revues. Les taux affichent leur numérateur et leur dénominateur. Les sessions uniques mesurent maintenant les ouvertures de formulaire et les commandes/demandes publiées, tandis que les volumes métier restent disponibles séparément. Les profils publics, annonces et services non explicitement réels sont également exclus du mode pilote réel.

**Contrôles réalisés :** 96 tests unitaires backend, 11 tests E2E sur une base PostgreSQL isolée, compilation backend, lint et vérification TypeScript frontend. Aucun déploiement Render ni migration de staging n’a encore été effectué.

**Indicateurs utiles :**
- part des demandes recevant au moins une réponse dans le délai cible ;
- taux de réponse et délai médian de première réponse ;
- part des devis/demandes acceptés qui aboutissent ;
- commandes ou prestations terminées et part donnant lieu à un avis ;
- clients qui reviennent pour une nouvelle demande.

Fixer les objectifs chiffrés avant le lancement du pilote, à partir de la capacité réelle de la cohorte, et non de volumes fictifs.

**À terminer avant le GO pilote :**
- [ ] Déployer la migration de provenance sur le staging et vérifier le funnel avec un petit jeu de données explicitement réel.
- [ ] Décider la cohorte pilote (ville, catégories, artisans et période) et fixer les cibles de réponse, d’acceptation, de clôture et de retour client.
- [ ] Revoir ou classer manuellement les anciennes boutiques, offres, demandes et commandes qui restent non classées.
- [ ] Tenir un relevé quotidien pendant la première semaine, puis une revue hebdomadaire avec décisions et actions correctives.

### 9. Observer l'activation des artisans avant de refaire l'onboarding

**Action :** mesurer les abandons entre inscription, profil complet, première offre publiée et première réponse. Simplifier l'onboarding seulement aux étapes où les artisans coincent effectivement.

**État au 27 septembre 2026 :** le funnel admin expose désormais quatre étapes distinctes pour les artisans réels de la période : comptes inscrits, profil de boutique actif et renseigné, offre réelle publiée, puis artisan ayant répondu à au moins une demande client ou demande de prestation. Les comptes nouvellement créés portent la provenance `isDemo`; les anciens comptes restent non classés et ne sont pas présentés comme une activation réelle. Les offres démo et les offres non publiées sont exclues du jalon « première offre ».

**À faire pendant le pilote :**
- [ ] Comparer chaque semaine les abandons entre ces quatre étapes par cohorte de ville et de métier.
- [ ] Relever le délai entre inscription, profil complet, première offre et première réponse.
- [ ] Interroger les artisans bloqués avant de modifier l’onboarding; ne pas déduire un problème UX à partir d’un petit volume.

## Priorité 2 — après les premiers résultats

### 10. Étendre le SEO local avec un seuil de qualité

Publier ou indexer une combinaison métier/ville seulement si elle contient assez d'artisans et d'offres réels pour aider le visiteur. Éviter les pages locales presque vides.

**État au 27 septembre 2026 :** les résultats publics exposent maintenant le nombre d’offres actives et réelles par boutique. Les pages locales canoniques passent en `noindex` lorsqu’elles comptent moins de 2 artisans ou moins de 2 offres réelles. Le sitemap local applique le même seuil; en mode démonstration, il n’expose pas les combinaisons de contenu fictif. Les filtres de quartier et de recherche restent non indexables.

**Contrôles réalisés :** tests backend des boutiques et du funnel, compilation backend, lint, TypeScript et build frontend. Le seuil doit encore être vérifié avec les données réelles du staging avant soumission aux moteurs.

**À faire avant indexation :**
- [ ] Vérifier sur staging les comptes, catégories, villes et offres effectivement retournés par le sitemap.
- [ ] Confirmer qu’une page locale indexée aide réellement le visiteur : coordonnées utilisables, offre disponible et informations exactes.
- [ ] Soumettre ou resoumettre le sitemap uniquement après validation de la cohorte et du contenu réel.

### 11. Valider la valeur des offres payantes

Les valeurs par défaut du produit indiquent actuellement Starter gratuit avec 3 annonces, Visibilité 7 jours à 1 000 FCFA, Local Plus à 3 000 FCFA, Croissance à 5 000 FCFA et Premium Growth à 10 000 FCFA. La configuration servie par l'API reste la référence à contrôler avant toute communication.

Avant de promettre plus de demandes ou de ventes, mesurer l'effet réel des options de visibilité et interroger les artisans sur leur disposition à payer.

**État au 27 septembre 2026 :** la page tarifs et le parcours d’abonnement mesurent désormais les vues de tarifs, les clics sur chaque plan et les souscriptions. Le funnel admin regroupe, par plan et sur la période choisie, vues, clics, souscriptions réelles, abonnements actifs et revenus associés. Les abonnements démo et les historiques non classés sont exclus; les paiements Mobile Money restent en sandbox/mock pour le pilote. Ces indicateurs décrivent l’adoption et le chiffre d’affaires enregistré, mais ne démontrent pas à eux seuls que la mise en avant augmente les ventes.

**À faire avant une décision tarifaire :**
- [ ] Définir une période de comparaison et une cohorte d’artisans Starter comparable aux utilisateurs payants.
- [ ] Mesurer séparément visibilité, demandes reçues, réponses, commandes terminées et revenus par plan.
- [ ] Interroger les artisans sur la disposition à payer et le bénéfice perçu, sans présenter les projections comme des résultats.
- [ ] Ne communiquer un avantage de visibilité ou de ventes qu’après validation sur des paiements réels et des données suffisamment nombreuses.

### 12. Garder l'offre institutionnelle sur une piste distincte

Le volet institutions peut devenir un produit à part entière, avec son propre acheteur, ses résultats attendus et son cycle de vente. Pendant le premier pilote marketplace, le traiter comme une piste stratégique séparée plutôt que de disperser l'équipe.

**État au 27 septembre 2026 :** l’espace institutionnel dispose déjà de routes, gardes d’accès, tableaux de bord et entités séparés pour les ressources, programmes, candidatures et dossiers de formalisation. Les nouveaux programmes, ressources et candidatures portent maintenant leur provenance `isDemo`; en mode réel, les artisans non classés ou démo ne sont pas inclus dans les indicateurs institutionnels et ne peuvent pas alimenter une candidature réelle. Les métriques marketplace (recherches, commandes, avis, plans payants) restent dans le funnel admin marketplace.

**À décider avant d’en faire une offre commerciale :**
- [ ] Choisir un institutionnel pilote et un programme concret avec bénéficiaires, zone, calendrier, budget et indicateurs validés.
- [ ] Définir l’acheteur, le livrable attendu, le responsable de compte et le cycle de reporting.
- [ ] Vérifier les règles d’accès aux données artisans et formalisation avant de partager un rapport externe.
- [ ] Mesurer séparément portée, candidatures, approbations, accompagnement et résultats du programme; ne pas les additionner aux KPI marketplace.

## Décisions à prendre avant le lancement

1. Quelle ville et quels métiers forment la première cohorte ?
2. Quels moyens de paiement sont réellement utilisables pendant le pilote ?
3. Les profils de démonstration sont-ils retirés ou explicitement marqués sur chaque carte ?
4. Qui traite les demandes sans réponse, les annulations, les réclamations et les remboursements ?
5. Quels objectifs chiffrables définir pour les réponses, les commandes terminées et les avis réels ?

## Conclusion

La base fonctionnelle est déjà plus avancée que ne le laisse entendre l'analyse initiale : vérification progressive, avis liés aux commandes, demandes de devis, commandes et gestion de certains incidents sont présents. Le risque principal du pilote est maintenant l'écart entre cette capacité technique et l'offre réelle, la clarté des conditions et l'exécution quotidienne.

Priorité : obtenir des interactions réelles et mesurables dans un périmètre limité, corriger les frictions observées, puis élargir sur la base des résultats.