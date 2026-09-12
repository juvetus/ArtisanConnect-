export type Role = 'artisan' | 'client' | 'admin';
export type ListingType = 'product' | 'service';
export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'confirmed' | 'captured' | 'refunded';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  bio?: string;
  location?: string;
  phone?: string;
}

export interface Listing {
  id: string;
  sellerId: string;
  seller?: User;
  title: string;
  description: string;
  category: string;
  type: ListingType;
  price: string;
  imageUrl?: string | null;
  status: 'active' | 'inactive';
  stock: number;
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
  paymentMethod: 'cash' | 'orange_money' | 'card';
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: string;
  method: 'cash' | 'orange_money' | 'stripe';
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
  read: boolean;
  createdAt: string;
}

export interface Thread {
  user: { id: string; name: string };
  lastMessage: Message;
  unread: number;
}

export interface AdminStats {
  users: number;
  artisans: number;
  clients: number;
  listings: number;
  orders: number;
  revenue: number;
  platformFees: number;
  pendingPayments: number;
}

export interface AdminOverview {
  stats: AdminStats;
  recentOrders: Order[];
}

export interface AuthSession {
  accessToken: string;
  user: User;
}

/** Le backend renvoie [items, total] pour les endpoints paginés. */
export type Paginated<T> = [T[], number];
