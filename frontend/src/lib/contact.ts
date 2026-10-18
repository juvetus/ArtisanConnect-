export const CONTACT_PHONE = '+237 656 356 347';
export const CONTACT_PHONE_HREF = 'tel:+237656356347';

const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || '237656356347';
export const CONTACT_WHATSAPP_HREF = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;
