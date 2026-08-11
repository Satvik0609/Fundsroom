import { ReactNode } from 'react';

export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface BadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const badgeColors: Record<string, string> = {
  LEAD: 'badge-info',
  ACTIVE: 'badge-success',
  INACTIVE: 'badge-default',
  DRAFT: 'badge-warning',
  CONFIRMED: 'badge-success',
  CANCELLED: 'badge-danger',
  IN: 'badge-success',
  OUT: 'badge-danger',
  RETAIL: 'badge-info',
  WHOLESALE: 'badge-default',
  DISTRIBUTOR: 'badge-info',
  ADMIN: 'badge-danger',
  SALES: 'badge-success',
  WAREHOUSE: 'badge-warning',
  ACCOUNTS: 'badge-info',
};

export function Badge({ status, variant }: BadgeProps) {
  const cls = variant ? `badge badge-${variant}` : `badge ${badgeColors[status] || 'badge-default'}`;
  return <span className={cls}>{status}</span>;
}

export function LoadingSpinner() {
  return <div className="loading-spinner">Loading...</div>;
}

export function EmptyState({ message }: { message: string }) {
  return <div className="empty-state">{message}</div>;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
      <span>Page {page} of {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Alert({ type, message, onClose }: { type: 'success' | 'error'; message: string; onClose?: () => void }) {
  return (
    <div className={`alert alert-${type}`}>
      {message}
      {onClose && <button onClick={onClose} className="alert-close">&times;</button>}
    </div>
  );
}
