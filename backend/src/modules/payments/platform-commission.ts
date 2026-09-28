export const PLATFORM_COMMISSION_RATE = 0.05;

function hasConfiguredSecret(value: string | undefined): boolean {
  return Boolean(value?.trim() && value.trim() !== '...' && !value.toLowerCase().includes('your_'));
}

export function isLivePlatformPayment(method: string): boolean {
  if (method === 'momo') {
    return process.env.MOMO_TARGET_ENVIRONMENT?.toLowerCase() === 'production'
      && process.env.MOMO_MODE === 'live'
      && hasConfiguredSecret(process.env.MOMO_API_USER)
      && hasConfiguredSecret(process.env.MOMO_API_KEY)
      && hasConfiguredSecret(process.env.MOMO_SUBSCRIPTION_KEY);
  }

  if (method === 'orange_money') {
    return process.env.ORANGE_MONEY_MODE === 'live'
      && hasConfiguredSecret(process.env.ORANGE_MONEY_CLIENT_ID)
      && hasConfiguredSecret(process.env.ORANGE_MONEY_CLIENT_SECRET)
      && hasConfiguredSecret(process.env.ORANGE_MONEY_MERCHANT_KEY);
  }

  return false;
}

export function calculateCollectedPlatformCommission(amount: number, method: string): number {
  if (!isLivePlatformPayment(method) || !Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * PLATFORM_COMMISSION_RATE);
}