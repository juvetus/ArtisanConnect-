<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Veille des appels d'offres et opportunites artisanales

- Administration : `/admin/opportunities` (admin/editeur : collecte, saisie manuelle, analyse, publication, archivage ; viewer : lecture).
- Artisans : `/opportunities`, preferences d'alerte, consultation des avis et groupements.
- Migration : `OpportunityWatch1761300000000`, apres `ArtisanFormalizationProfile1761200000000`. Elle est enregistree dans le module de base de donnees.

### Sources et fonctionnement du pilote

Les collecteurs lisent uniquement les metadonnees publiques (titre, organisme, localisation, reference,
echeance et lien officiel). Ils ne copient ni les dossiers ni les documents payants :

- ARMP : `https://armp.cm/`, dix premieres pages maximum par passage. Seuls les types AO, DC et AMI
  sont retenus ; les attributions, communiques et additifs ne deviennent pas de nouveaux appels.
- UNGM : recherche publique des avis actifs concernant le Cameroun (pays 2327), dix pages de quinze avis maximum.
  La session publique et son jeton de formulaire sont utilises normalement, sans compte ni contournement.
- COLEPS : lien officiel affiche ; **pas de collecteur active**. MINMAP, agregateurs, mairies et entreprises
  ne sont pas annonces comme integres. Un administrateur peut saisir leurs avis publics manuellement.

Cette couverture est volontairement bornee, non exhaustive. Les sources peuvent changer leur HTML,
leurs conditions d'utilisation ou limiter les requetes : les erreurs HTTP et de structure sont
consignees dans les journaux de collecte. Ne pas contourner les restrictions d'acces.
La deduplication repose sur la source et l'identifiant de l'avis ; les corrections ou annulations
ulterieures doivent etre controlees sur le site officiel et peuvent etre archivees par l'administration.

Definir `OPPORTUNITY_WATCH_ENABLED=true` pour programmer la collecte a **06:00, Africa/Douala**.
Une collecte manuelle est placee dans une file PostgreSQL et prise en charge sous une minute par le
backend ; elle ne bloque pas une requete HTTP pendant les acces aux sources. Une seule collecte est
executee a la fois, y compris avec plusieurs instances. Les travaux interrompus sont signales ; une
nouvelle collecte est possible apres vingt minutes. Le backend doit rester actif pour executer les taches.

Avec cette option activee, l'analyse IA traite cinq brouillons en attente toutes les dix minutes.
Elle utilise `AI_API_KEY`, `AI_BASE_URL` et `AI_MODEL`, uniquement avec les metadonnees publiques.
Sans configuration IA, l'analyse est marquee en echec, jamais remplacee par une fausse analyse.
L'admin peut relancer une analyse ou renseigner manuellement resume et metiers.
Une date limite manquante ou douteuse doit etre verifiee avant publication. Les heures ARMP et les
formulaires admin sont interpretes dans le fuseau du Cameroun ; les decalages GMT d'UNGM sont conserves.

Chaque avis est importe en **brouillon**. L'admin/editeur verifie la source, le resume, l'organisme,
la localisation, les metiers et une echeance future avant publication. L'IA ne determine ni une
eligibilite juridique ni une qualification effective au marche. Aucun depot d'offre automatique.

### Alertes, consentement et suivi

Les destinataires doivent etre des artisans actifs non-demo, avec RCCM + NIU + carte professionnelle
declares, ou un dossier de formalisation approuve. Ils choisissent leurs metiers dans les preferences
et s'abonnent explicitement. Les metiers d'alerte utilisent les identifiants du catalogue existant.
L'e-mail et WhatsApp disposent chacun d'un consentement distinct ; WhatsApp est desactive par defaut.
Le desabonnement reste possible meme si l'artisan ne remplit plus les conditions de formalisation.

Les alertes des avis publies non expires sont preparees et traitees toutes les dix minutes
(cent livraisons par passage pour le pilote). Le ciblage et le consentement sont verifies avant envoi.
La contrainte unique `(opportunityId, userId, channel)` evite de diffuser plusieurs fois le meme avis
sur le meme canal. Les notifications internes sont inserees transactionnellement avec leur statut.

- E-mail : configuration SMTP existante, `FRONTEND_URL` et adresse utilisateur verifiee.
- WhatsApp : configuration Meta et modele de notification existants, numero renseigne et consentement utilisateur.
  Le canal reste suspendu par defaut : definir `OPPORTUNITY_WHATSAPP_ENABLED=true` uniquement
  apres approbation et verification du modele Meta. Cette option ne modifie pas les autres notifications WhatsApp.
- SMS et push mobile : **non inclus** dans ce pilote.

Les etats `pending`, `sending`, `sent`, `failed`, `skipped` sont visibles en administration.
`sent` signifie accepte par le canal, pas lu ni garanti livre. Un canal non configure est un echec
explicite. Un envoi interrompu est marque en echec au passage suivant apres quinze minutes.
Il n'y a pas de relance automatique d'un echec externe : un fournisseur peut avoir accepte un envoi
avant une coupure reseau. Verifier son journal avant toute intervention pour eviter les doublons.
Les preferences et l'historique ne sont pas transmis aux fournisseurs IA.

### Groupements

Un artisan eligible cree un groupement de 2 a 20 personnes (5 par defaut), lui compris.
Les autres artisans demandent a rejoindre volontairement ; seul le createur accepte ou refuse.
Les acceptations sont serialisees par verrou de ligne pour ne jamais depasser la capacite.
Les demandes en attente ne sont visibles que par leur auteur et le createur.
Les membres acceptes peuvent contacter le coordinateur via la messagerie existante.
Un membre peut retirer sa demande ou quitter le groupement ; le createur peut fermer les adhesions.
Des notifications **internes uniquement** signalent les demandes et decisions.
Il s'agit d'une mise en relation, pas de la constitution juridique d'un groupement ni d'une garantie
d'eligibilite, de disponibilite ou de succes de la candidature.

### Validation ciblee

```powershell
# Parseurs et regles (sans reseau ni base)
npm run test -- src/modules/opportunities/opportunity-sources.spec.ts

# Test reel des sources publiques (requiert un acces Internet)
$env:OPPORTUNITY_LIVE_SOURCES='true'
npm run test -- src/modules/opportunities/opportunity-sources.spec.ts

# Workflow PostgreSQL isole : uniquement une base locale, schema temporaire cree puis supprime
$env:OPPORTUNITY_INTEGRATION='true'
node --env-file=.env node_modules\vitest\vitest.mjs run src/modules/opportunities/opportunities.integration.spec.ts
```

Le test PostgreSQL ne modifie pas les tables applicatives existantes. Il couvre la migration,
l'acces, la file de collecte, la deduplication, la validation humaine, l'IA invalide,
le ciblage, le consentement, les echecs de canaux et les acceptations concurrentes d'un groupement.

## Deployment

### Première initialisation d’un staging Render

Le dépôt ne contient pas encore de migration initiale qui crée toutes les tables. Une base PostgreSQL Render neuve doit donc être amorcée une seule fois :

1. Dans le service API staging, définir temporairement `DB_SYNCHRONIZE=true`.
2. Déployer et attendre que l’API démarre correctement; TypeORM crée le schéma et n’exécute pas les migrations pendant cette étape.
3. Remettre immédiatement `DB_SYNCHRONIZE=false`.
4. Redéployer l’API. Les migrations, dont `PilotFunnelProvenance1760400000000`, s’exécutent alors dans l’ordre.
5. Vérifier dans les logs `migrations` et dans l’endpoint admin `/analytics/funnel` que la base staging répond.

Ne jamais utiliser cette procédure sur une base de production existante. Après l’amorçage, `DB_SYNCHRONIZE` doit rester à `false`.

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observer](https://observer.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
