export function normalizeInternationalPhone(phone: string) {
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) return trimmed.slice(1).replace(/\D/g, '');
  if (trimmed.startsWith('00')) return trimmed.slice(2).replace(/\D/g, '');

  const digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('237')) return digits;
  if (digits.startsWith('0')) return `237${digits.slice(1)}`;
  return `237${digits}`;
}

export function whatsappHref(phone: string | null | undefined, message: string) {
  if (!phone?.trim()) return null;
  const number = normalizeInternationalPhone(phone);
  if (number.length < 9) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
