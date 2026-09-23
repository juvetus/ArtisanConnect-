import type { AdminOverview, AdminSubscription, AnalyticsFunnel, ArtisanFormalization, AuthSession, CustomerRequestStatus, InstitutionDashboard, InstitutionalProgram, InstitutionalResource, Listing, Message, NotificationItem, NotificationsResponse, Order, Paginated, Payment, ProgramApplication, ProgramApplicationStatus, ProgramType, PublicArtisan, Report, ReportReason, ReportStatus, ReportTargetType, ResourceType, Review, Role, Shop, ShopType, Thread, User } from './types';

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

export async function downloadProtectedFile(path: string, filename: string) {
  const response = await fetch(`${API_URL}${path}`, { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const message = Array.isArray(detail?.message) ? detail.message[0] : detail?.message;
    throw new ApiError(message ?? `Erreur de téléchargement (${response.status})`, response.status);
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };
  // Pour un FormData on laisse le navigateur définir le Content-Type (boundary).
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

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

const delete_ = <T>(path: string) =>
  request<T>(path, { method: 'DELETE' });

export const api = {
  register: (data: { email?: string; phone?: string; password: string; name: string; role: Role; gender?: 'female' | 'male' | 'cooperative' | 'other' }) =>
    post<User & { developmentOtp?: string; accountStatus?: string }>('/auth/register', data),

  login: (data: { identifier: string; password: string }) => post<AuthSession>('/auth/login', data),

  verifyPhone: (phone: string, code: string) => post<{ success: boolean; message: string; user: User }>('/auth/verify-phone', { phone, code }),

  verifyEmail: (token: string) => post<{ success: boolean; message: string; user: User }>('/auth/verify-email', { token }),

  resendVerification: (email?: string) => post<{ success: boolean; message: string }>('/auth/resend-verification', { email }),

  forgotPassword: (email: string) => post<{ success: boolean; message: string }>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) => post<{ success: boolean; message: string }>('/auth/reset-password', { token, password }),

  assistantGenerate: (data: { task: string; input: string; language?: 'fr' | 'en'; context?: string }) =>
    post<{ content: string; provider: 'ai' | 'local' }>('/assistant/generate', data),

    updateProfile: (id: string, data: { name?: string; phone?: string; whatsappPhone?: string; location?: string; bio?: string; avatarUrl?: string }) => patch<User>(`/users/${id}`, data),

    uploadAvatar: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<{ avatarUrl: string }>('/users/avatar', { method: 'POST', body: form });
    },

    getUser: (id: string) => request<User>(`/users/${id}`),

  sendContactMessage: async (data: { name: string; email: string; subject: string; message: string; city?: string; neighborhood?: string }, files: File[] = []) => {
    const form = new FormData();
    Object.entries(data).forEach(([key, value]) => form.append(key, value ?? ''));
    files.forEach((file) => form.append('files', file));
    return request<{ sent: boolean; message: string }>('/contact', { method: 'POST', body: form });
  },

  listings: (
    params: {
      q?: string;
      category?: string;
      type?: string;
      city?: string;
      neighborhood?: string;
      minPrice?: number;
      maxPrice?: number;
      skip?: number;
      take?: number;
    } = {},
  ) => {
    const search = new URLSearchParams(
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== '' && value !== null)
        .map(([key, value]) => [key, String(value)]),
    );
    return request<Paginated<Listing>>(`/listings?${search}`);
  },

  listing: (id: string) => request<Listing>(`/listings/${id}`),

  sponsorListing: (id: string) => post<Listing>(`/listings/${id}/sponsor`),

  stopSponsoringListing: (id: string) => post<Listing>(`/listings/${id}/sponsor/stop`),

  sellerListings: (sellerId: string) => request<Listing[]>(`/listings/seller/${sellerId}`),

  createListing: (data: Partial<Listing>) => post<Listing>('/listings', data),

  updateListing: (id: string, data: Partial<Listing>) => patch<Listing>(`/listings/${id}`, data),

  deleteListing: (id: string) => request<{ success: boolean }>(`/listings/${id}`, { method: 'DELETE' }),

  uploadListingImage: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ imageUrl: string }>('/listings/upload', {
      method: 'POST',
      body: form,
      // request() laisse le navigateur générer le multipart boundary pour un FormData.
    });
  },

  uploadListingImages: async (files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    return request<{ imageUrls: string[] }>('/listings/upload-multiple', { method: 'POST', body: form });
  },

  // Le serveur calcule le montant et la commission à partir de l'annonce.
  createOrder: (data: {
    listingId: string;
    quantity: number;
    paymentMethod: 'cash' | 'momo' | 'orange_money';
    deliveryMethod: 'workshop' | 'home' | 'carrier';
    deliveryAddress?: string;
    deliveryLatitude?: number;
    deliveryLongitude?: number;
  }) => post<Order>('/orders', data),

  buyerOrders: (buyerId: string) => request<Paginated<Order>>(`/orders/buyer/${buyerId}`),

  sellerOrders: (sellerId: string) => request<Paginated<Order>>(`/orders/seller/${sellerId}`),

  updateOrderStatus: (id: string, status: Order['status']) =>
    patch<Order>(`/orders/${id}/status`, { status }),

  confirmCash: (orderId: string) => post<Payment>(`/payments/order/${orderId}/confirm-cash`),

  confirmOrangeMoneyTest: (orderId: string) =>
    post<Payment>(`/payments/order/${orderId}/orange-money/confirm-test`),

  initiateMomoPayment: (orderId: string, payerPhone: string) =>
    post<Payment & { paymentReference?: string | null; redirectUrl?: string | null }>(`/payments/order/${orderId}/momo/initiate`, { payerPhone }),

  confirmMomoPayment: (orderId: string) =>
    post<Payment>(`/payments/order/${orderId}/momo/confirm`),

  getSubscriptionPlans: () => request<Array<{ id: string; name: string; slug: string; price: number; currency: string; durationDays: number; description?: string | null; features?: string[]; sortOrder?: number }>>('/subscriptions/plans'),

  getPlanStatus: () =>
    request<{ premium: boolean; planName: string; planSlug: string | null; endDate: string | null; listingLimit: number | null }>('/subscriptions/status'),

  createSubscription: (planId: string, payerPhone: string) => post<{ id: string; status: string; paymentReference?: string | null; redirectUrl?: string | null; amount: number; currency: string; planId: string }>('/subscriptions/create/' + planId, { payerPhone }),

  confirmSubscriptionPayment: (referenceId: string) =>
    post<{ id: string; status: string; paymentReference?: string | null; amount: number; currency: string; planId: string }>(`/subscriptions/confirm/${encodeURIComponent(referenceId)}`),

  getMomoPaymentCallback: (referenceId: string) =>
    request<{ status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED'; amount: number; currency: string; externalId: string; referenceId?: string; transactionId?: string; message?: string }>(`/momo/payment/callback?referenceId=${encodeURIComponent(referenceId)}`),

  createReview: (data: { orderId: string; rating: number; comment: string }) =>
    post<Review>('/reviews', data),

  orderReview: (orderId: string) => request<Review | null>(`/reviews/order/${orderId}`),

  sellerRating: (sellerId: string) =>
    request<{ average: number | null; count: number }>(`/reviews/rating/${sellerId}`),

  sellerReviews: (sellerId: string) => request<Paginated<Review>>(`/reviews/recipient/${sellerId}`),

  threads: () => request<Thread[]>('/messages/threads'),

  conversation: (otherUserId: string) =>
    request<Paginated<Message>>(`/messages/conversation/${otherUserId}`),

  sendMessage: (data: { recipientId?: string; orderId?: string; serviceOrderId?: string; content: string }) =>
    post<Message>('/messages', data),

  serviceOrderConversation: (serviceOrderId: string) =>
    request<Paginated<Message>>(`/messages/service-order/${serviceOrderId}`),

  uploadServiceAttachment: async (serviceOrderId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<Message>(`/messages/service-order/${serviceOrderId}/attachments`, { method: 'POST', body: form });
  },

  unreadCount: () => request<{ unreadCount: number }>('/messages/unread'),

  adminOverview: () => request<AdminOverview>('/admin/overview'),

  adminUsers: () => request<User[]>('/admin/users'),

  adminCreateUser: (data: { name: string; email: string; password: string; role: Role; gender?: 'female' | 'male' | 'cooperative' | 'other' }) =>
    post<User>('/admin/users', data),

  adminListings: () => request<Listing[]>('/admin/listings'),

  adminOrders: () => request<Order[]>('/admin/orders'),

  adminSubscriptions: () => request<AdminSubscription[]>('/admin/subscriptions'),

  adminCancelOrder: (id: string) => patch<Order>(`/admin/orders/${id}/cancel`, {}),

  adminRefundOrder: (id: string) => patch<Order>(`/admin/orders/${id}/refund`, {}),

  adminSetListingStatus: (id: string, status: Listing['status']) =>
    patch<Listing>(`/admin/listings/${id}/status`, { status }),

  adminSetUserRole: (id: string, role: Role) =>
    patch<User>(`/admin/users/${id}/role`, { role }),

  adminSetUserStatus: (id: string, isActive: boolean) =>
    patch<User>(`/admin/users/${id}/status`, { isActive }),

  adminDeleteUser: (id: string) => delete_<void>(`/admin/users/${id}`),

  institutionResources: () => request<InstitutionalResource[]>('/institutions/resources'),

  institutionPrograms: () => request<InstitutionalProgram[]>('/institutions/programs'),

  institutionMyResources: () => request<InstitutionalResource[]>('/institutions/my-resources'),

  institutionMyPrograms: () => request<InstitutionalProgram[]>('/institutions/my-programs'),

  institutionDashboard: () => request<InstitutionDashboard>('/institutions/dashboard'),

  institutionFormalizations: () => request<ArtisanFormalization[]>('/institutions/formalizations'),
  adminFormalizations: () => request<ArtisanFormalization[]>('/admin/formalizations'),
  adminReviewFormalization: (id: string, status: ArtisanFormalization['status'], notes?: string) =>
    patch<ArtisanFormalization>(`/admin/formalizations/${id}/status`, { status, notes }),

  institutionCreateResource: (data: { title: string; description: string; type: ResourceType; theme: string; contentUrl?: string; imageUrls?: string[]; videoUrls?: string[]; pdfUrls?: string[] }) =>
    post<InstitutionalResource>('/institutions/resources', data),

  institutionUploadMedia: async (files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    return request<{ imageUrls: string[]; videoUrls: string[]; pdfUrls: string[] }>('/institutions/upload-media', { method: 'POST', body: form });
  },

  institutionCreateProgram: (data: { title: string; description: string; type: ProgramType; eligibility?: string; budget?: number; interventionZone?: string; startDate?: string; endDate?: string; objectives?: string; targetBeneficiaries?: string; impactIndicators?: string[]; imageUrls?: string[]; videoUrls?: string[]; pdfUrls?: string[] }) =>
    post<InstitutionalProgram>('/institutions/programs', data),

  institutionUpdateResource: (id: string, data: Partial<{ title: string; description: string; type: ResourceType; theme: string; contentUrl?: string; imageUrls?: string[]; videoUrls?: string[] }>) =>
    patch<InstitutionalResource>(`/institutions/resources/${id}`, data),

  institutionUpdateProgram: (id: string, data: Partial<{ title: string; description: string; type: ProgramType; eligibility?: string; budget?: number; interventionZone?: string; startDate?: string; endDate?: string; objectives?: string; targetBeneficiaries?: string; impactIndicators?: string[]; imageUrls?: string[]; videoUrls?: string[]; status?: 'active' | 'closed' }>) =>
    patch<InstitutionalProgram>(`/institutions/programs/${id}`, data),

  institutionDeleteResource: (id: string) =>
    delete_<void>(`/institutions/resources/${id}`),

  institutionDeleteProgram: (id: string) =>
    delete_<void>(`/institutions/programs/${id}`),

  applyToProgram: (programId: string, motivation: string) =>
    post(`/program-applications/${programId}`, { motivation }),

  myProgramApplications: () => request<ProgramApplication[]>(`/program-applications/mine`),

  institutionApplications: () => request<ProgramApplication[]>('/program-applications/institution'),

  institutionReviewApplication: (id: string, status: ProgramApplicationStatus, notes?: string) =>
    patch<ProgramApplication>(`/program-applications/${id}/status`, { status, notes }),

  /** Villes et quartiers réellement couverts par des boutiques actives. */
  publicLocations: () =>
    request<{ label: string; count: number; neighborhoods: { label: string; count: number }[] }[]>('/shops/public/locations'),

  shopPublic: async (id: string) => {
    const data = await request<{ shop: Shop; listings: Listing[] } | [{ shop: Shop; listings: Listing[] }]>(`/shops/${id}/public`);
    return Array.isArray(data) ? data[0] : data;
  },

  /** Annuaire public d'artisans (boutiques actives) utilisé sur l'accueil et la recherche. */
  publicArtisans: (
    params: {
      take?: number;
      q?: string;
      city?: string;
      neighborhood?: string;
      category?: string;
      verified?: boolean;
      minRating?: number;
    } = {},
  ) => {
    const query = new URLSearchParams();
    if (params.take) query.set('take', String(params.take));
    if (params.q) query.set('q', params.q);
    if (params.city) query.set('city', params.city);
    if (params.neighborhood) query.set('neighborhood', params.neighborhood);
    if (params.category) query.set('category', params.category);
    if (params.verified) query.set('verified', 'true');
    if (params.minRating) query.set('minRating', String(params.minRating));
    const suffix = query.toString();
    return request<PublicArtisan[]>(`/shops/public${suffix ? `?${suffix}` : ''}`);
  },

  institutionReviewFormalization: (id: string, status: ArtisanFormalization['status'], notes?: string) =>
    patch<ArtisanFormalization>(`/institutions/formalizations/${id}/status`, { status, notes }),

  myFormalization: () => request<ArtisanFormalization | null>('/institutions/formalizations/me'),

  submitFormalization: (data: { businessName: string; registrationNumber?: string; taxId?: string; documentsUrl?: string }) =>
    post<ArtisanFormalization>('/institutions/formalizations', data),

  // --- Boutiques (workflow vendeur) ---

  createShop: (data: {
    type: ShopType;
    name: string;
    description: string;
    category?: string;
    city?: string;
    neighborhood?: string;
    market?: string;
    latitude?: number;
    longitude?: number;
    mobileMoneyNumber: string;
    momoNumber?: string;
    orangeMoneyNumber?: string;
    mobileMoneyProvider?: 'momo' | 'orange_money' | 'both';
    deliveryMode: 'workshop' | 'home';
    deliveryMethods?: ('workshop' | 'home' | 'carrier')[];
    kycDocuments: { label: string; url: string; publicId?: string; resourceType?: string; format?: string }[];
    isWomenLed?: boolean;
    isCooperative?: boolean;
  }) => post<Shop>('/shops', data),

  uploadKycDocument: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ url: string; publicId?: string; resourceType?: string; format?: string }>('/shops/kyc/upload', {
      method: 'POST',
      body: form,
    });
  },

  adminKycUrl: (shopId: string, label: string) =>
    request<{ url: string }>(`/shops/admin/${shopId}/kyc-url?label=${encodeURIComponent(label)}`),

  myShops: () => request<Shop[]>('/shops/mine'),

  myShopMetrics: () => request<Record<string, { views: number; whatsappContactClicks: number; whatsappShareClicks: number }>>('/shops/mine/metrics'),

  shopMetrics: (id: string) => request<{ views: number; whatsappContactClicks: number; whatsappShareClicks: number }>(`/shops/${id}/metrics`),

  incrementShopMetric: (id: string, metric: 'views' | 'whatsappContactClicks' | 'whatsappShareClicks', delta = 1) =>
    post<{ views: number; whatsappContactClicks: number; whatsappShareClicks: number }>(`/shops/${id}/metrics`, { metric, delta }),

  updateShop: (id: string, data: { name?: string; description?: string; category?: string; availability?: 'available' | 'busy' | 'unavailable'; city?: string; neighborhood?: string; market?: string; latitude?: number; longitude?: number; deliveryMode?: 'workshop' | 'home'; deliveryMethods?: ('workshop' | 'home' | 'carrier')[]; mobileMoneyNumber?: string; momoNumber?: string; orangeMoneyNumber?: string; mobileMoneyProvider?: 'momo' | 'orange_money' | 'both'; isWomenLed?: boolean; isCooperative?: boolean }) =>
    patch<Shop>(`/shops/${id}`, data),

  setShopActive: (id: string, active: boolean) => patch<Shop>(`/shops/${id}/status`, { active }),

  adminShops: () => request<Shop[]>('/admin/shops'),

  adminReviewShop: (id: string, approve: boolean, reason?: string) =>
    patch<Shop>(`/admin/shops/${id}/review`, { approve, reason }),

  adminSetShopStatus: (id: string, status: 'active' | 'suspended') =>
    patch<Shop>(`/admin/shops/${id}/status`, { status }),

  adminSetShopIdentityVerified: (id: string, verified: boolean) =>
    patch<Shop>(`/admin/shops/${id}/identity`, { verified }),

  // --- Signalements et modération ---

  createReport: (data: { targetType: ReportTargetType; targetId: string; reason: ReportReason; details?: string }) =>
    post<Report>('/reports', data),

  myReports: () => request<Report[]>('/reports/mine'),

  adminReports: (status?: ReportStatus) =>
    request<Report[]>(`/reports/admin${status ? `?status=${status}` : ''}`),

  adminModerateReport: (id: string, status: ReportStatus, notes?: string) =>
    patch<Report>(`/reports/admin/${id}`, { status, notes }),

  analyticsFunnel: (days = 30) => request<AnalyticsFunnel>(`/analytics/funnel?days=${days}`),

  adminDeleteShop: (id: string) => delete_<void>(`/admin/shops/${id}`),

  adminDeleteListing: (id: string) => delete_<void>(`/admin/listings/${id}`),

  // --- Workflow escrow Orange Money ---

  startWebpayment: (orderId: string) =>
    post<{ transactionId: string; paymentToken: string; notifToken?: string; paymentUrl: string; status: 'PENDING' }>(
      `/payments/order/${orderId}/webpayment`,
    ),

  confirmAvailability: (orderId: string) =>
    post<Order>(`/payments/order/${orderId}/confirm-availability`),

  rejectAvailability: (orderId: string) =>
    post<{ refunded: boolean }>(`/payments/order/${orderId}/reject-availability`),

  carrierVerify: (orderId: string, pickedUp: boolean, conform: boolean) =>
    post<{ refunded: boolean }>(`/payments/order/${orderId}/carrier-verify`, { pickedUp, conform }),

  confirmReception: (orderId: string) =>
    post<Order>(`/payments/order/${orderId}/confirm-reception`),

  disburse: (orderId: string) => post<Payment>(`/payments/order/${orderId}/disbursement`),

  refundOrder: (orderId: string) => post<{ refunded: boolean }>(`/payments/order/${orderId}/refund`),

  createDeliveryRide: (orderId: string) =>
    post<{ trackingId: string; status: Order['deliveryStatus']; carrierName: string; estimatedCost?: number; trackingUrl?: string }>(`/delivery/orders/${orderId}/ride`),

  getDeliveryStatus: (orderId: string) =>
    request<{ trackingId: string; status: Order['deliveryStatus']; carrierName: string; estimatedCost?: number; trackingUrl?: string }>(`/delivery/orders/${orderId}/status`),

  // --- Notifications ---

  notifications: (skip = 0, take = 30) =>
    request<NotificationsResponse>(`/notifications?skip=${skip}&take=${take}`),

  notificationsUnread: () => request<{ unreadCount: number }>('/notifications/unread'),

  markNotificationRead: (id: string) => patch<{ success: boolean }>(`/notifications/${id}/read`, {}),

  markAllNotificationsRead: () => post<{ success: boolean }>('/notifications/read-all'),

  downloadInstitutionReport: async () => {
    const res = await fetch(`${API_URL}/institutions/report.csv`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    if (!res.ok) throw new ApiError('Le rapport ne peut pas être téléchargé.', res.status);
    return res.blob();
  },

  // --- Services (Artisans) ---
  getApprovedServices: (limit: number = 20, skip: number = 0, filters: { q?: string; category?: string; city?: string } = {}) => {
    const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
    if (filters.q) params.set('q', filters.q);
    if (filters.category) params.set('category', filters.category);
    if (filters.city) params.set('city', filters.city);
    return request(`/services?${params}`);
  },

  searchServices: (query: string, category?: string, limit: number = 20) =>
    request(`/services/search?q=${encodeURIComponent(query)}&category=${category || ''}&limit=${limit}`),

  getServicesByCategory: (category: string) =>
    request(`/services/category/${category}`),

  getService: (id: string) =>
    request(`/services/${id}`),

  createService: (data: { title: string; description: string; price?: number; priceMin?: number; priceMax?: number; estimatedDays: number; category: string; tags?: string[]; fileUrls?: string[]; videoUrls?: string[]; externalUrls?: string[] }) =>
    post(`/services`, data),

  getMyServices: () =>
    request(`/services/me/list`),

  uploadServiceImages: async (files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    return request<{ imageUrls: string[] }>('/services/upload-images', { method: 'POST', body: form });
  },

  uploadServiceVideos: async (files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    return request<{ videoUrls: string[] }>('/services/upload-videos', { method: 'POST', body: form });
  },

  updateService: (id: string, data: Partial<{ title: string; description: string; price?: number; priceMin?: number; priceMax?: number; estimatedDays: number; category: string; tags?: string[]; fileUrls?: string[]; videoUrls?: string[]; externalUrls?: string[] }>) =>
    patch(`/services/${id}`, data),

  publishService: (id: string) =>
    post(`/services/${id}/publish`, {}),

  deleteService: (id: string) =>
    delete_(`/services/${id}`),

    // Admin service validation endpoints
    getServiceDashboardStats: () =>
      request(`/services/admin/dashboard-stats`),

    getPendingValidationServices: () =>
      request(`/services/admin/pending-validation`),

    getValidationRequestedServices: () =>
      request(`/services/admin/validation-requested`),

    approveService: (id: string) =>
      post(`/services/admin/${id}/approve`, {}),

    rejectService: (id: string, feedback: string) =>
      post(`/services/admin/${id}/reject`, { feedback }),

    requestServiceRevision: (id: string, feedback: string) =>
      post(`/services/admin/${id}/request-revision`, { feedback }),

    getServiceValidationHistory: () => request(`/services/admin/validation-history`),

    exportServicesCsv: () =>
      request<string>(`/services/admin/export.csv`),

    createServiceOrder: (data: {
      serviceId: string;
      projectObjective: string;
      options?: Record<string, unknown>;
      inspirationLinks?: string;
      budgetMin?: number;
      budgetMax?: number;
      requestedDate?: string;
      deliveryMethod: 'home' | 'workshop' | 'carrier';
      deliveryAddress?: string;
      deliveryLatitude?: number;
      deliveryLongitude?: number;
      fileUrls?: string[];
      clientConfirmed: boolean;
      termsAccepted: boolean;
    }) => post(`/service-orders`, data),

    uploadServiceOrderFiles: async (id: string, files: File[]) => {
      const form = new FormData();
      files.forEach((file) => form.append('files', file));
      return request(`/service-orders/${id}/files`, { method: 'POST', body: form });
    },

    getMyServiceOrders: () => request(`/service-orders/mine`),

    createCustomerRequest: (data: { category: string; city: string; neighborhood?: string; description: string; budgetMin?: number; budgetMax?: number; requestedDate?: string; contactPreference?: 'platform' | 'whatsapp' | 'both'; contactPhone?: string }) => post<{ id: string }>('/customer-requests', data),

    uploadCustomerRequestPhotos: async (id: string, files: File[]) => {
      const form = new FormData();
      files.forEach((file) => form.append('files', file));
      return request(`/customer-requests/${id}/photos`, { method: 'POST', body: form });
    },
    getMyCustomerRequests: () => request<{ id: string; category: string; city: string; description: string; status: CustomerRequestStatus; responses?: { artisanId: string; artisan?: { name?: string; phone?: string; whatsappPhone?: string } | null; price?: number; days?: number; message: string; status?: 'accepted' | 'rejected' }[] }[]>('/customer-requests/mine'),
    completeCustomerRequest: (id: string) => post(`/customer-requests/${id}/complete`, {}),
    getOpenCustomerRequests: (filters: { category?: string; city?: string } = {}) => request<{ id: string; category: string; city: string; neighborhood?: string | null; description: string; budgetMin?: number | null; budgetMax?: number | null; requestedDate?: string | null; fileUrls?: string[] | null; status: CustomerRequestStatus; matchScore?: number; targeted?: boolean; alreadyAnswered?: boolean }[]>(`/customer-requests/artisan/open?category=${encodeURIComponent(filters.category ?? '')}&city=${encodeURIComponent(filters.city ?? '')}`),
    getCustomerRequestStats: () => request<{ requestsReceived: number; responsesSent: number; openRequests: number; averageResponseMinutes: number }>('/customer-requests/artisan/stats'),
    getArtisanResponseHistory: (artisanId: string) =>
      request<{ requestsReceived: number; responsesSent: number; responseRate: number; averageResponseMinutes: number; lastResponseAt: string | null }>(`/customer-requests/artisan/${artisanId}/public-stats`),
    respondToCustomerRequest: (id: string, data: { price?: number; days?: number; message: string }) => post(`/customer-requests/${id}/respond`, data),
    decideCustomerRequestResponse: (id: string, artisanId: string, decision: 'accepted' | 'rejected') => post(`/customer-requests/${id}/responses/${artisanId}/decision`, { decision }),

    getPendingServiceOrders: () => request(`/service-orders/admin/pending`),

    validateServiceOrder: (id: string) => post(`/service-orders/admin/${id}/validate`, {}),

    requestServiceOrderDetails: (id: string, feedback: string) =>
      post(`/service-orders/admin/${id}/request-details`, { feedback }),

    rejectServiceOrder: (id: string, feedback: string) =>
      post(`/service-orders/admin/${id}/reject`, { feedback }),

    getServiceOrder: (id: string) => request(`/service-orders/${id}`),

    getServiceQuote: (id: string) => request(`/service-orders/${id}/quote`),

    proposeServiceQuote: (id: string, data: { proposedPrice: number; proposedDays: number; details: string; items?: { description: string; quantity: number; unitPrice: number }[]; terms?: string }) =>
      post(`/service-orders/${id}/quote`, data),

    respondToServiceQuote: (id: string, accepted: boolean, response?: string) =>
      post(`/service-orders/${id}/quote/respond`, { accepted, response }),

    getArtisanServiceOrders: () => request(`/service-orders/artisan/mine`),

    artisanRespondToServiceOrder: (id: string, accepted: boolean, feedback?: string) =>
      post(`/service-orders/${id}/artisan/respond`, { accepted, feedback }),

    startServiceOrder: (id: string) =>
      post(`/service-orders/${id}/artisan/start`, {}),

    deliverServiceOrder: (id: string, fileUrls: string[]) =>
      post(`/service-orders/${id}/artisan/deliver`, { fileUrls }),

    respondToServiceDelivery: (id: string, accepted: boolean, feedback?: string) =>
      post(`/service-orders/${id}/client/delivery-response`, { accepted, feedback }),

    getServiceOrderPayments: (id: string) => request(`/service-orders/${id}/payments`),

    confirmServicePaymentTest: (id: string, type: 'deposit' | 'balance') =>
      post(`/service-orders/${id}/payments/${type}/confirm-test`, {}),

    downloadServiceOrderPdf: (id: string) => downloadProtectedFile(`/service-orders/${id}/pdf`, `commande-${id}.pdf`),
    downloadServiceQuotePdf: (id: string) => downloadProtectedFile(`/service-orders/${id}/quote/pdf`, `devis-${id}.pdf`),
    downloadServicePaymentPdf: (id: string, type: 'deposit' | 'balance') => downloadProtectedFile(`/service-orders/${id}/payments/${type}/pdf`, `recu-${type}-${id}.pdf`),
    downloadServiceAttachment: (path: string, filename: string) => downloadProtectedFile(path, filename),
    downloadAdminReportPdf: () => downloadProtectedFile('/admin/report.pdf', 'rapport-admin.pdf'),

    createServiceReview: (data: { orderId: string; rating: number; comment?: string }) =>
      post(`/service-reviews`, data),

    getMyServiceReview: (orderId: string) => request(`/service-reviews/order/${orderId}`),

    getArtisanServiceReviews: (artisanId: string) => request(`/service-reviews/recipient/${artisanId}`),

    getArtisanServiceRating: (artisanId: string) => request(`/service-reviews/recipient-rating/${artisanId}`),
  };
