import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marque une route accessible sans jeton JWT. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
