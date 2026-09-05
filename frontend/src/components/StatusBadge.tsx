import type { OrderStatus, PaymentStatus } from '@/lib/types';

const LABELS: Record<OrderStatus | PaymentStatus, { text: string; className: string }> = {
  pending: { text: 'En attente', className: 'bg-stone-100 text-stone-700' },
  confirmed: { text: 'Confirmé', className: 'bg-blue-100 text-blue-800' },
  completed: { text: 'Terminé', className: 'bg-green-100 text-green-800' },
  cancelled: { text: 'Annulé', className: 'bg-red-100 text-red-800' },
  captured: { text: 'Encaissé', className: 'bg-green-100 text-green-800' },
  refunded: { text: 'Remboursé', className: 'bg-orange-100 text-orange-800' },
};

export function StatusBadge({ status }: { status: OrderStatus | PaymentStatus }) {
  const { text, className } = LABELS[status];
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{text}</span>
  );
}
