This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Product photos

In the workshop listing form, the product name is entered under "Nom du produit".
You can add up to five photos, including through successive file selections.
Drag photos to reorder them on desktop, or use "Set as main" on mobile or with
the keyboard. The first photo is always the main image. "Remove" removes a photo
from the listing, not from media storage. Changes take effect when the listing is
published or saved.

## Tender alert trades

The trade picker in alert preferences and tender administration is alphabetized
by the displayed language (French or English). Search ignores case and accents;
filtering does not remove existing selections. Digital services (`numerique`)
and livestock (`elevage`) are included in the backend trade catalog used for
preferences, tender publication, AI classification and matching alerts.

## Shop location

The shop creation form uses "Lieu-dit" for the local landmark (the API keeps the
existing `market` field). Optional GPS latitude and longitude can be entered in
decimal degrees with a dot or comma. Both must be supplied together, within
[-90, 90] and [-180, 180]. The map follows valid coordinates; clicking the map or
dragging its marker fills both fields. The backend validates coordinate pairs on
creation and update. No database migration is needed.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
