import type { AdminOverview, AuthSession, Listing, Message, Order, Paginated, Payment, Review, Role, Thread, User } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Permet au contexte d'auth de purger une session dont le jeton n'est plus accepté. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.();
    // Le backend renvoie { message } sur les erreurs Nest ; sinon on retombe sur le statut.
    const detail = await res.json().catch(() => null);
    const message = Array.isArray(detail?.message) ? detail.message[0] : detail?.message;
    throw new ApiError(message ?? `Erreur ${res.status}`, res.status);
  }

  return res.status === 204 ? (undefined as T) : res.json();
}

const post = <T>(path: string, body: unknown = {}) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });

const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

export const api = {
  register: (data: { email: string; password: string; name: string; role: Role }) =>
    post<User>('/auth/register', data),

  login: (data: { email: string; password: string }) => post<AuthSession>('/auth/login', data),

  listings: (params: { q?: string; category?: string; type?: string } = {}) => {
    const search = new URLSearchParams(
      Object.entries(params).filter(([, v]) => Boolean(v)) as [string, string][],
    );
    return request<Paginated<Listing>>(`/listings?${search}`);
  },

  listing: (id: string) => request<Listing>(`/listings/${id}`),

  sellerListings: (sellerId: string) => request<Listing[]>(`/listings/seller/${sellerId}`),

  createListing: (data: Partial<Listing>) => post<Listing>('/listings', data),

  // Le serveur calcule le montant et la commission à partir de l'annonce.
  createOrder: (listingId: string, quantity: number, paymentMethod: 'cash' | 'orange_money') =>
    post<Order>('/orders', { listingId, quantity, paymentMethod }),

  buyerOrders: (buyerId: string) => request<Paginated<Order>>(`/orders/buyer/${buyerId}`),

  sellerOrders: (sellerId: string) => request<Paginated<Order>>(`/orders/seller/${sellerId}`),

  updateOrderStatus: (id: string, status: Order['status']) =>
    patch<Order>(`/orders/${id}/status`, { status }),

  confirmCash: (orderId: string) => post<Payment>(`/payments/order/${orderId}/confirm-cash`),

  confirmOrangeMoneyTest: (orderId: string) =>
    post<Payment>(`/payments/order/${orderId}/orange-money/confirm-test`),

  createReview: (data: { orderId: string; rating: number; comment: string }) =>
    post<Review>('/reviews', data),

  orderReview: (orderId: string) => request<Review | null>(`/reviews/order/${orderId}`),

  sellerRating: (sellerId: string) =>
    request<{ average: number | null; count: number }>(`/reviews/rating/${sellerId}`),

  sellerReviews: (sellerId: string) => request<Paginated<Review>>(`/reviews/recipient/${sellerId}`),

  threads: () => request<Thread[]>('/messages/threads'),

  conversation: (otherUserId: string) =>
    request<Paginated<Message>>(`/messages/conversation/${otherUserId}`),

  sendMessage: (data: { recipientId: string; orderId?: string; content: string }) =>
    post<Message>('/messages', data),

  unreadCount: () => request<{ unreadCount: number }>('/messages/unread'),

  adminOverview: () => request<AdminOverview>('/admin/overview'),

  adminUsers: () => request<User[]>('/admin/users'),

  adminListings: () => request<Listing[]>('/admin/listings'),

  adminOrders: () => request<Order[]>('/admin/orders'),

  adminSetListingStatus: (id: string, status: Listing['status']) =>
    patch<Listing>(`/admin/listings/${id}/status`, { status }),

  adminSetUserRole: (id: string, role: 'artisan' | 'client') =>
    patch<User>(`/admin/users/${id}/role`, { role }),
};
