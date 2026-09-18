const SESSION_KEY = 'artisan-connect-visitor';

export type TrackedEvent =
  | 'search'
  | 'category_view'
  | 'artisan_profile_view'
  | 'listing_view'
  | 'whatsapp_click'
  | 'quote_form_opened';

/** Identifiant aléatoire de navigateur : sert à compter les visiteurs, pas à les identifier. */
function sessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let value = localStorage.getItem(SESSION_KEY);
    if (!value) {
      value = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, value);
    }
    return value;
  } catch {
    return null;
  }
}

/** Envoi best-effort : la mesure ne doit jamais casser ni ralentir le parcours. */
export function trackEvent(
  type: TrackedEvent,
  payload: { label?: string; targetId?: string; city?: string } = {},
): void {
  const session = sessionId();
  if (!session) return;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const body = JSON.stringify({ type, sessionId: session, ...payload });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${apiUrl}/analytics/events`, new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch(`${apiUrl}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // La mesure est facultative.
  }
}
