export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export function isDemoContent(id: string, explicitlyDemo?: boolean): boolean {
  return DEMO_MODE || explicitlyDemo === true || (explicitlyDemo === undefined && id.startsWith('demo-'));
}