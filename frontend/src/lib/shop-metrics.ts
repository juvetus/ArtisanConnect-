export type ShopMetricKey = 'views' | 'whatsappContactClicks' | 'whatsappShareClicks';

export type ShopMetrics = {
  views: number;
  whatsappContactClicks: number;
  whatsappShareClicks: number;
};

const STORAGE_PREFIX = 'artisanconnect:shop-metrics';

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function readShopMetrics(shopId: string): ShopMetrics {
  if (typeof window === 'undefined' || !shopId) {
    return { views: 0, whatsappContactClicks: 0, whatsappShareClicks: 0 };
  }

  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${shopId}`);
  const metrics = safeParse<Partial<ShopMetrics> | null>(raw, null);

  return {
    views: Number(metrics?.views ?? 0),
    whatsappContactClicks: Number(metrics?.whatsappContactClicks ?? 0),
    whatsappShareClicks: Number(metrics?.whatsappShareClicks ?? 0),
  };
}

export function writeShopMetrics(shopId: string, metrics: ShopMetrics) {
  if (typeof window === 'undefined' || !shopId) return;
  try {
    const payload: ShopMetrics = {
      views: Number(metrics.views ?? 0),
      whatsappContactClicks: Number(metrics.whatsappContactClicks ?? 0),
      whatsappShareClicks: Number(metrics.whatsappShareClicks ?? 0),
    };
    window.localStorage.setItem(`${STORAGE_PREFIX}:${shopId}`, JSON.stringify(payload));
  } catch {
    // Local storage may be disabled in private browsing or restricted environments.
  }
}

export function incrementShopMetric(shopId: string, metric: ShopMetricKey) {
  if (!shopId || typeof window === 'undefined') return;

  const current = readShopMetrics(shopId);
  const next: ShopMetrics = {
    ...current,
    [metric]: Number(current[metric]) + 1,
  };
  writeShopMetrics(shopId, next);

  const gtag = (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === 'function') {
    gtag('event', 'shop_metric', {
      shop_id: shopId,
      metric,
    });
  }

  const dataLayer = (window as typeof window & { dataLayer?: unknown[] }).dataLayer;
  if (Array.isArray(dataLayer)) {
    dataLayer.push({ event: 'shop_metric', shop_id: shopId, metric });
  }
}

export function readManyShopMetrics(shopIds: string[]) {
  return shopIds.reduce<Record<string, ShopMetrics>>((acc, shopId) => {
    if (!shopId) return acc;
    acc[shopId] = readShopMetrics(shopId);
    return acc;
  }, {});
}
