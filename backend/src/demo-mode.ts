export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE !== undefined) return process.env.DEMO_MODE === 'true';
  return process.env.NODE_ENV !== 'test';
}