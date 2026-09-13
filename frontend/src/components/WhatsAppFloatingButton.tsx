const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '237699000000';

export function WhatsAppFloatingButton() {
  const message = encodeURIComponent('Bonjour ArtisanConnect, j’ai besoin d’aide.');
  const href = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Contacter ArtisanConnect sur WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white shadow-lg ring-4 ring-white transition hover:bg-green-700 focus:outline-none focus:ring-green-200"
    >
      WA
    </a>
  );
}
