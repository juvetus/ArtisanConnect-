# Test candidat - Representant local ArtisanConnect

## Objectif

Ce test permet d'evaluer :

- la motivation du candidat ;
- sa comprehension du projet et de ses utilisateurs ;
- sa capacite a effectuer un parcours complet ;
- son attention aux details et aux anomalies ;
- sa capacite a expliquer ArtisanConnect a un artisan ou a un client ;
- sa facon de prioriser les problemes et de proposer des ameliorations.

Le candidat n'est pas evalue uniquement sur le nombre d'anomalies trouvees. La qualite de son raisonnement, de ses questions et de ses remontes est essentielle.

## Format propose

- Duree du test : 2 a 3 heures.
- Echange de restitution : 30 a 45 minutes.
- Environnement : version pilote ou preproduction.
- Appareil : telephone obligatoire, ordinateur recommande.
- Comptes fournis : client test, artisan test et, si necessaire, un acces admin accompagne.
- Aucun acces aux mots de passe, cles API, variables Render ou donnees personnelles reelles.

## Brief a remettre au candidat

> ArtisanConnect est une marketplace camerounaise qui met en relation des artisans, des clients et des vendeurs locaux. Votre mission est de tester l'application comme si vous deviez accompagner les premiers utilisateurs du pilote.
>
> Vous devez comprendre le parcours, essayer les fonctions principales, relever les problemes et expliquer ce qui pourrait empecher un artisan ou un client d'utiliser la plateforme.
>
> Ne cherchez pas uniquement les bugs techniques. Observez aussi la clarte des textes, la confiance, la simplicite, la vitesse de comprehension, la langue, le mobile et la logique du parcours.

## Mission 1 - Decouverte libre

Sans explication supplementaire, demander au candidat :

1. Ouvrir la page d'accueil.
2. Expliquer en deux minutes ce que fait ArtisanConnect.
3. Identifier les utilisateurs principaux de la plateforme.
4. Dire ce qui lui semble clair et ce qui lui semble confus.
5. Donner trois questions qu'un artisan debutant pourrait poser.

### Ce que l'equipe observe

- Comprend-il rapidement la proposition de valeur ?
- Distingue-t-il produits, services, boutiques et demandes client ?
- Remarque-t-il les elements qui inspirent confiance ?
- Pose-t-il des questions utiles avant de conclure ?

## Mission 2 - Parcours client complet

Avec le compte client de test :

1. S'inscrire ou se connecter.
2. Choisir la langue francaise puis anglaise.
3. Rechercher un produit par mot-cle.
4. Filtrer par type, ville, quartier et budget.
5. Ouvrir une fiche produit.
6. Verifier le vendeur, le prix, les images, les moyens de paiement et la livraison.
7. Contacter l'artisan par messagerie.
8. Ouvrir le lien WhatsApp si disponible.
9. Publier une demande dans « Je cherche un artisan ».
10. Ajouter une description, un budget et une photo si possible.
11. Verifier que la demande apparait dans « Mes demandes ».
12. Passer une commande de test en especes ou en mode mock indique par l'equipe.
13. Verifier le statut de la commande.

### Questions de restitution

- A quel moment avez-vous hesite ?
- Les informations de prix et de livraison etaient-elles suffisantes ?
- Auriez-vous confiance pour contacter cet artisan ? Pourquoi ?
- Le parcours est-il utilisable depuis un telephone avec une connexion moyenne ?

## Mission 3 - Parcours artisan complet

Avec le compte artisan de test :

1. Completer le profil : nom, telephone, WhatsApp, ville et presentation.
2. Creer une boutique.
3. Choisir le type de boutique.
4. Renseigner Mobile Money et les modes de livraison.
5. Ajouter une piece de verification facultative si l'environnement le permet.
6. Creer une annonce produit avec titre, description, prix, stock et images.
7. Reorganiser les images par glisser-deposer.
8. Verifier que la premiere image devient l'image principale.
9. Creer un service avec prix, delai, photos et liens sociaux.
10. Modifier le service apres sa creation.
11. Envoyer le service pour validation.
12. Consulter les opportunites client.
13. Repondre a une demande client avec un prix et un delai.
14. Ouvrir l'Assistant IA texte.
15. Ouvrir le Studio images IA.
16. Verifier le quota d'images lie a l'abonnement.
17. Tester une generation avec une photo reelle de reference si le compte est eligible.
18. Observer la difference entre une photo reelle, une image IA et une realisation de portfolio.

### Points importants a observer

- Les champs obligatoires sont-ils visibles ?
- Les messages d'erreur expliquent-ils comment corriger le probleme ?
- L'artisan comprend-il ce qui est en attente de validation ?
- La separation entre photo reelle et image IA est-elle claire ?
- Les liens sociaux et le bouton de mise en avant sont-ils faciles a comprendre ?

## Mission 4 - Parcours administration accompagne

Avec un administrateur de l'equipe ou une demonstration partagee d'ecran :

1. Consulter une boutique en attente de validation.
2. Examiner ses informations et ses justificatifs.
3. Consulter les dossiers de formalisation.
4. Examiner un dossier et demander une correction.
5. Valider un service.
6. Creer un code promotionnel.
7. Choisir une remise entre 10 % et 100 %.
8. Limiter le code a un ou plusieurs plans.
9. Definir une date d'expiration et un nombre maximal d'utilisations.
10. Verifier qu'un code ne peut pas etre reutilise abusivement.
11. Verifier les abonnements et les paiements mock.

Le candidat ne doit pas modifier les donnees reelles de production sans autorisation.

## Mission 5 - Test responsive et langue

Tester au minimum :

- telephone mobile ;
- ordinateur ;
- francais ;
- anglais ;
- connexion ou chargement lent si possible.

Verifier notamment :

- navigation laterale ;
- boutons visibles et utilisables ;
- formulaires sans chevauchement ;
- menus deroulants ;
- televersement de fichiers ;
- images et videos ;
- messages de succes et d'erreur ;
- textes qui restent dans leur conteneur.

## Fiche de remontée d'anomalie

Pour chaque anomalie, utiliser ce format :

### Anomalie n°____

- Titre court :
- Gravite : ☐ Bloquante ☐ Majeure ☐ Mineure ☐ Suggestion
- Parcours : client / artisan / admin / public
- Page ou URL :
- Appareil et navigateur :
- Langue :
- Etapes pour reproduire :
  1.
  2.
  3.
- Resultat attendu :
- Resultat observe :
- Capture ou video :
- Frequence : toujours / parfois / une seule fois
- Proposition du candidat :

## Definition des priorites

### Bloquante

Impossible de continuer ou risque important : inscription impossible, paiement incoherent, perte de donnees, acces a un compte interdit.

### Majeure

Une fonction importante ne fonctionne pas ou cree une forte confusion : commande, contact, boutique, service ou upload inutilisable.

### Mineure

Probleme de texte, affichage, traduction ou confort sans bloquer le parcours.

### Suggestion

Amelioration utile mais non necessaire pour terminer le parcours.

## Livrable attendu du candidat

A remettre avant l'entretien de restitution :

1. Une fiche d'anomalies avec captures.
2. Les cinq problemes les plus importants classes par priorite.
3. Trois points positifs de l'application.
4. Trois propositions d'amelioration pour les artisans camerounais.
5. Une explication de deux minutes pour presenter ArtisanConnect a un artisan.
6. Une recommandation : lancer le pilote maintenant, lancer avec corrections, ou ne pas lancer.
7. Une courte note sur la maniere dont il recruterait les premiers artisans et recueillerait leurs retours.

## Grille d'evaluation interne

Noter chaque categorie de 1 a 5 :

| Critere | Note |
|---|---:|
| Motivation et curiosite | /5 |
| Compréhension du projet | /5 |
| Qualite du parcours realise | /5 |
| Detection et reproduction des anomalies | /5 |
| Priorisation des risques | /5 |
| Qualite des propositions | /5 |
| Communication avec les artisans | /5 |
| Autonomie et rigueur | /5 |
| Total | /40 |

### Interpretation indicative

- 32-40 : profil tres solide pour piloter le terrain.
- 25-31 : profil interessant avec accompagnement.
- 18-24 : motivation a confirmer par un second exercice.
- Moins de 18 : profil probablement premature pour representer le pilote.

## Questions pour l'entretien final

1. Quelle anomalie vous parait la plus dangereuse pour la confiance d'un client ?
2. Quelle fonction expliqueriez-vous en premier a un artisan qui ne connait pas la plateforme ?
3. Comment reagiriez-vous si un artisan refuse de telecharger ses justificatifs ?
4. Comment distingueriez-vous une vraie erreur d'une demande d'amelioration personnelle ?
5. Comment recueilleriez-vous les retours d'un artisan peu a l'aise avec le numerique ?
6. Que feriez-vous si trois artisans signalent le meme probleme ?
7. Comment presenteriez-vous les paiements mock sans tromper l'utilisateur ?
8. Quel serait votre plan pour recruter et accompagner les dix premiers artisans ?

## Decision

Candidat : ____________________________________

Date : ____ / ____ / ______

Score : ______ / 40

Decision : ☐ Retenir ☐ Retenir avec accompagnement ☐ Second test ☐ Ne pas retenir

Commentaires :

____________________________________________________________________

____________________________________________________________________

____________________________________________________________________
