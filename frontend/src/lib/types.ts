export type Role = 'artisan' | 'client' | 'institution' | 'admin' | 'editor' | 'viewer';
export type ListingType = 'product' | 'service';
export type ShopType = 'artisan' | 'reseller' | 'individual';
export type ShopStatus = 'pending' | 'active' | 'rejected' | 'suspended';

export interface AdminSubscription {
  id: string;
  status: 'pending' | 'active' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  lastPaymentAt: string | null;
  nextPaymentAt: string | null;
  paymentReference: string | null;
  provider: string;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
  plan: { id: string; slug: string; name: string } | null;
}

export interface KycDocument {
  label: string;
  url: string;
  publicId?: string;
  resourceType?: string;
  format?: string;
}

export interface Shop {
  id: string;
  sellerId: string;
  seller?: User;
  type: ShopType;
  name: string;
  description: string;
  category?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  market?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mobileMoneyNumber: string;
  momoNumber?: string | null;
  orangeMoneyNumber?: string | null;
  mobileMoneyProvider?: 'momo' | 'orange_money' | 'both';
  deliveryMode: 'workshop' | 'home';
  deliveryMethods?: ('workshop' | 'home' | 'carrier')[] | null;
  kycDocuments: KycDocument[];
  mobileMoneyVerified: boolean;
  status: ShopStatus;
  rejectionReason?: string | null;
  availability?: 'available' | 'busy' | 'unavailable';
  verifiedBadge: boolean;
  topSellerBadge: boolean;
  identityVerified?: boolean;
  identityVerifiedAt?: string | null;
  verification?: VerificationState;
  isWomenLed?: boolean;
  isCooperative?: boolean;
  successfulSales: number;
  views?: number;
  whatsappContactClicks?: number;
  whatsappShareClicks?: number;
  createdAt: string;
}

/** Tunnel de conversion exposé par le backend. */
export interface AnalyticsFunnel {
  periodDays: number;
  funnel: Record<string, number>;
  conversion: {
    visitorToQuote: number;
    visitorToOrder: number;
    quoteToAnswer: number;
    profileViewToWhatsapp: number;
  };
  artisans: { registered: number; active: number; withIdentityVerified: number };
  topSearches: { label: string; count: number }[];
  topCategories: { label: string; count: number }[];
  topCities: { label: string; count: number }[];
}

/** Cycle de vie d'une demande de devis. */export type CustomerRequestStatus = 'new' | 'contacted' | 'in_progress' | 'completed';

export const CUSTOMER_REQUEST_STATUS_LABELS: Record<CustomerRequestStatus, string> = {
  new: 'Nouvelle',
  contacted: 'Artisans contactés',
  in_progress: 'En cours',
  completed: 'Terminée',
};

/** Signalement d'un contenu ou d'un vendeur. */export type ReportTargetType = 'listing' | 'shop' | 'user' | 'review';
export type ReportReason = 'fraud' | 'inappropriate' | 'counterfeit' | 'spam' | 'wrong_info' | 'other';
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporterId: string;
  reporter?: User;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  moderatorNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

/** Niveaux de vérification progressifs calculés par le backend. */export type VerificationLevel = 'none' | 'phone' | 'profile' | 'identity' | 'recommended';

export interface VerificationState {
  level: VerificationLevel;
  steps: { phone: boolean; profile: boolean; identity: boolean; recommended: boolean };
}

/** Fiche artisan publique affichée sur l'accueil (aucun numéro de téléphone exposé). */
export interface PublicArtisan {
  id: string;
  name: string;
  description: string;
  category?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  verifiedBadge: boolean;
  topSellerBadge: boolean;
  isWomenLed?: boolean;
  isCooperative?: boolean;
  successfulSales: number;
  premium?: boolean;
  createdAt: string;
  coverImageUrl?: string | null;
  rating: { average: number | null; count: number };
  verification: VerificationState;
  seller: { id: string; name: string | null; avatarUrl?: string | null; verifiedPhone: boolean };
}

/** Preuves KYC exigées par type de boutique (miroir du backend). */
export const SHOP_REQUIRED_DOCS: Record<ShopType, { label: string; labelFr: string }[]> = {
  artisan: [
    { label: 'piece_identite', labelFr: "Pièce d'identité" },
    { label: 'photo_atelier', labelFr: "Photo de l'atelier" },
    { label: 'photo_produit_1', labelFr: 'Photo produit 1' },
    { label: 'photo_produit_2', labelFr: 'Photo produit 2' },
    { label: 'photo_produit_3', labelFr: 'Photo produit 3' },
  ],
  reseller: [
    { label: 'video_vendeur_produit', labelFr: 'Vidéo vendeur avec le produit' },
    { label: 'photo_produit', labelFr: 'Photo du produit seul' },
    { label: 'photo_produit_emballe', labelFr: 'Photo du produit emballé' },
  ],
  individual: [
    { label: 'photo_vendeur_produit', labelFr: 'Photo du vendeur avec le produit' },
    { label: 'photo_produit', labelFr: 'Photo du produit' },
  ],
};

export const SHOP_OPTIONAL_DOCS: Record<ShopType, { label: string; labelFr: string }[]> = {
  artisan: [],
  reseller: [{ label: 'piece_identite', labelFr: "Pièce d'identité (facultative)" }],
  individual: [{ label: 'piece_identite', labelFr: "Pièce d'identité (facultative)" }],
};
export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'confirmed' | 'captured' | 'refunded';
export type DeliveryMethod = 'workshop' | 'home' | 'carrier';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  gender?: 'female' | 'male' | 'cooperative' | 'other' | null;
  bio?: string;
  location?: string;
  phone?: string;
  whatsappPhone?: string;
  avatarUrl?: string | null;
  verifiedEmail?: boolean;
  isActive?: boolean;
}

export interface Listing {
  id: string;
  sellerId: string;
  shopId?: string | null;
  shop?: Shop;
  seller?: User;
  title: string;
  description: string;
  category: string;
  type: ListingType;
  price: string;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  aiImageUrls?: string[] | null;
  status: 'active' | 'inactive';
  stock: number;
  acceptedPaymentMethods?: ('cash' | 'momo' | 'orange_money')[] | null;
  deliveryMethods?: ('workshop' | 'home' | 'carrier')[] | null;
  sponsoredUntil?: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  buyer?: User;
  seller?: User;
  listing?: Listing;
  payment?: Payment;
  quantity: number;
  totalPrice: string;
  platformFee: string;
  status: OrderStatus;
  paymentMethod: 'cash' | 'momo' | 'orange_money' | 'card';
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string | null;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  deliveryCarrier?: string | null;
  deliveryTrackingId?: string | null;
  deliveryStatus: 'pending' | 'assigned' | 'picking_up' | 'in_transit' | 'delivered' | 'cancelled';
  deliveryTrackingUrl?: string | null;
  deliveryCost?: string | null;
  sellerConfirmedAvailability: boolean;
  carrierPickedUp: boolean;
  carrierVerified: boolean;
  buyerConfirmedReception: boolean;
  cancellationReason?: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: string;
  method: 'cash' | 'momo' | 'orange_money' | 'stripe';
  status: PaymentStatus;
  cashConfirmedAt?: string | null;
  orangeMoneyTransactionId?: string | null;
}

export interface Review {
  id: string;
  orderId: string;
  reviewerId: string;
  recipientId: string;
  reviewer?: User;
  rating: number;
  comment: string;
  verified: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  orderId?: string | null;
  sender?: User;
  recipient?: User;
  content: string;
  fileUrls?: string[];
  read: boolean;
  createdAt: string;
}

export interface Thread {
  user: { id: string; name: string };
  lastMessage: Message;
  unread: number;
}

export type NotificationType = 'new_order' | 'order_status' | 'payment' | 'shop_review' | 'service_review' | 'general';

export interface NotificationItem {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  content: string;
  link?: string | null;
  relatedId?: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  items: NotificationItem[];
  total: number;
  unreadCount: number;
}

export interface AdminStats {
  users: number;
  artisans: number;
  clients: number;
  institutions?: number;
  listings: number;
  orders: number;
  revenue: number;
  platformFees: number;
  servicePlatformFees?: number;
  pendingPayments: number;
  womenArtisans?: number;
  womenPercentage?: number;
  cooperativeArtisans?: number;
  cooperativePercentage?: number;
  resources?: number;
  programs?: number;
  programApplications?: number;
  activeShops?: number;
  shopViews?: number;
  whatsappContacts?: number;
  shopShares?: number;
  successfulSales?: number;
}

export interface AdminOverview {
  stats: AdminStats;
  recentOrders: Order[];
}

export interface AuthSession {
  accessToken: string;
  user: User;
}

export type ResourceType = 'training' | 'guide' | 'template';
export type ProgramType = 'training' | 'support' | 'funding' | 'grant';
export type FormalizationStatus = 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';

export interface InstitutionalResource {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  theme: string;
  contentUrl?: string | null;
  imageUrls?: string[];
  videoUrls?: string[];
  externalUrls?: string[];
  pdfUrls?: string[];
  published: boolean;
  institution?: User;
  createdAt: string;
}

export interface InstitutionalProgram {
  id: string;
  title: string;
  description: string;
  type: ProgramType;
  eligibility?: string | null;
    budget?: number | null;
    interventionZone?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    objectives?: string | null;
    targetBeneficiaries?: string | null;
    impactIndicators?: string[];
    imageUrls?: string[];
    videoUrls?: string[];
    pdfUrls?: string[];
  status: 'active' | 'closed';
  institution?: User;
  createdAt: string;
}

export type ProgramApplicationStatus = 'submitted' | 'in_review' | 'accepted' | 'rejected';

export interface ProgramApplication {
  id: string;
  artisanId: string;
  programId: string;
  motivation: string;
  status: ProgramApplicationStatus;
  institutionNotes?: string | null;
  artisan?: User;
  program?: InstitutionalProgram;
  createdAt: string;
  updatedAt: string;
}

export interface ArtisanFormalization {
  id: string;
  artisan: User;
  businessName: string;
  registrationNumber?: string | null;
  taxId?: string | null;
  documentsUrl?: string | null;
  status: FormalizationStatus;
  progress: number;
  institutionNotes?: string | null;
  updatedAt: string;
}

export interface InstitutionDashboard {
  stats: {
    artisans: number;
    institutions: number;
    listings: number;
    orders: number;
    pendingFormalizations: number;
    approvedFormalizations: number;
    resources: number;
    programs: number;
    womenArtisans?: number;
    womenPercentage?: number;
    cooperativeArtisans?: number;
    cooperativePercentage?: number;
  };
}

export type ServiceStatus = 'draft' | 'pending_validation' | 'validation_requested' | 'approved' | 'rejected';

export interface Service {
  id: string;
  title: string;
  description: string;
  price?: number;
  priceMin?: number;
  priceMax?: number;
  estimatedDays: number;
  category: string;
  tags?: string[];
  fileUrls?: string[];
  videoUrls?: string[];
  externalUrls?: string[];
  status: ServiceStatus;
  validationFeedback?: string | null;
  artisan?: User;
  validatedBy?: User | null;
  createdAt: string;
  updatedAt: string;
  validatedAt?: string | null;
  revisionDueAt?: string | null;
  averageRating?: number | null;
  reviewCount?: number;
}

export type ServiceOrderStatus =
  | 'pending_admin_validation'
  | 'details_requested'
  | 'sent_to_artisan'
  | 'quote_pending'
  | 'accepted'
  | 'in_progress'
  | 'delivered'
  | 'completed'
  | 'disputed'
  | 'cancelled'
  | 'rejected';

export interface ServiceOrder {
  id: string;
  clientId: string;
  artisanId: string;
  serviceId: string;
  projectObjective: string;
  options: Record<string, unknown>;
  inspirationLinks?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  platformFee: number;
  requestedDate?: string | null;
  deliveryMethod: 'home' | 'workshop' | 'carrier';
  deliveryAddress?: string | null;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  fileUrls?: string[];
  status: ServiceOrderStatus;
  adminFeedback?: string | null;
  deliveryFeedback?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  service?: Service;
  artisan?: User;
  client?: User;
}

export interface ServiceReview {
  id: string;
  orderId: string;
  serviceId: string;
  reviewerId: string;
  recipientId: string;
  rating: number;
  comment?: string | null;
  verified: boolean;
  createdAt: string;
  reviewer?: User;
}

export interface ServiceValidationHistory {
  id: string;
  serviceId: string;
  adminId?: string | null;
  action: 'approved' | 'rejected' | 'revision_requested' | 'auto_rejected';
  previousStatus?: string | null;
  newStatus: string;
  feedback?: string | null;
  createdAt: string;
  service?: Service;
  admin?: User;
}

export type ServiceQuoteStatus = 'pending' | 'accepted' | 'rejected';

export interface ServiceQuote {
  id: string;
  quoteNumber: string;
  orderId: string;
  artisanId: string;
  proposedPrice: number;
  proposedDays: number;
  details: string;
  items?: { description: string; quantity: number; unitPrice: number }[];
  terms?: string | null;
  currency?: string;
  status: ServiceQuoteStatus;
  clientResponse?: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  artisan?: User;
}

export interface ServicePayment {
  id: string;
  orderId: string;
  type: 'deposit' | 'balance';
  amount: number;
  status: 'pending' | 'paid' | 'refunded';
  method: 'orange_money' | 'stripe' | 'cash';
  transactionId?: string | null;
  paidAt?: string | null;
}

/** Le backend renvoie [items, total] pour les endpoints paginés. */
export type Paginated<T> = [T[], number];
