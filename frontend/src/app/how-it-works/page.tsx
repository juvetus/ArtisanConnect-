import Link from 'next/link';

const clientSteps = [
  ['Recherchez', 'Parcourez les produits, services, créatrices locales et coopératives par catégorie.'],
  ['Choisissez', 'Consultez les photos, descriptions, prix, villes et profils artisans.'],
  ['Contactez ou commandez', 'Discutez avec l’artisan ou passez une commande directement sur ArtisanConnect.'],
  ['Payez simplement', 'Pendant le pilote, les espèces sont réelles et les paiements mobiles restent en mode test.'],
];

const artisanSteps = [
  ['Créez votre compte', 'Inscrivez-vous comme artisan, créatrice locale ou coopérative / GIC.'],
  ['Ouvrez votre boutique', 'Les pièces KYC sont facultatives au lancement et peuvent être complétées plus tard.'],
  ['Publiez vos offres', 'Ajoutez vos produits ou services avec photos, prix, ville et disponibilité.'],
  ['Répondez aux clients', 'Recevez les commandes, messages et demandes de devis depuis votre tableau de bord.'],
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <section className="rounded-xl bg-stone-900 px-6 py-10 text-white">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">Guide ArtisanConnect</p>
        <h1 className="mt-3 text-3xl font-semibold md:text-4xl">Comment ça marche ?</h1>
        <p className="mt-3 max-w-3xl text-stone-200">
          ArtisanConnect connecte les clients avec les artisans camerounais pour commander des produits faits main, demander des services et échanger en toute simplicité.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/" className="rounded-lg bg-amber-600 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-700">Explorer la marketplace</Link>
          <Link href="/register" className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-stone-900 hover:bg-stone-100">Créer un compte</Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="text-2xl font-semibold text-stone-900">Pour les clients</h2>
          <div className="mt-5 space-y-4">
            {clientSteps.map(([title, description], index) => (
              <div key={title} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">{index + 1}</span>
                <div>
                  <h3 className="font-semibold text-stone-900">{title}</h3>
                  <p className="mt-1 text-sm text-stone-600">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="text-2xl font-semibold text-stone-900">Pour les artisans</h2>
          <div className="mt-5 space-y-4">
            {artisanSteps.map(([title, description], index) => (
              <div key={title} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">{index + 1}</span>
                <div>
                  <h3 className="font-semibold text-stone-900">{title}</h3>
                  <p className="mt-1 text-sm text-stone-600">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-semibold text-stone-900">Paiements</h2>
          <p className="mt-2 text-sm text-stone-600">Espèces pour les transactions réelles du pilote. MoMo et Orange Money restent prêts en sandbox/mock jusqu’à réception des clés API.</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-semibold text-stone-900">Livraison</h2>
          <p className="mt-2 text-sm text-stone-600">Retrait à l’atelier, livraison à domicile ou transporteur partenaire selon la commande et la disponibilité.</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-semibold text-stone-900">Confiance</h2>
          <p className="mt-2 text-sm text-stone-600">Validation manuelle des boutiques artisan et messagerie interne pour garder une trace des échanges.</p>
        </div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-xl font-semibold text-stone-900">Besoin d’aide ?</h2>
        <p className="mt-2 text-sm text-stone-700">Une question sur une commande, une boutique ou un service ? Contactez l’équipe ArtisanConnect.</p>
        <Link href="/contact" className="mt-4 inline-block rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">Nous contacter</Link>
      </section>
    </div>
  );
}
