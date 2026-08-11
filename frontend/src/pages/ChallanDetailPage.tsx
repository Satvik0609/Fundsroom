import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { SalesChallan } from '../types';
import { useAuth } from '../context/AuthContext';
import { Badge, LoadingSpinner, Alert, formatCurrency, formatDateTime } from '../utils/helpers';

export default function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const canWrite = hasRole('ADMIN', 'SALES');
  const [challan, setChallan] = useState<SalesChallan | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    if (!id) return;
    api.getChallan(id)
      .then((res) => setChallan(res.data))
      .catch((err) => setAlert({ type: 'error', message: err.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleConfirm = async () => {
    if (!id || !window.confirm('Confirm this challan? Stock will be deducted.')) return;
    setActionLoading(true);
    try {
      await api.confirmChallan(id);
      setAlert({ type: 'success', message: 'Challan confirmed successfully' });
      load();
    } catch (err: unknown) {
      const apiErr = err as { message?: string; details?: { available?: number; requested?: number } };
      let msg = apiErr.message || 'Confirmation failed';
      if (apiErr.details?.available !== undefined) {
        msg += ` — Available: ${apiErr.details.available}, Requested: ${apiErr.details.requested}`;
      }
      setAlert({ type: 'error', message: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id || !window.confirm('Cancel this challan?')) return;
    setActionLoading(true);
    try {
      await api.cancelChallan(id);
      setAlert({ type: 'success', message: 'Challan cancelled' });
      load();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setAlert({ type: 'error', message: apiErr.message || 'Cancel failed' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!challan) return <div>Challan not found</div>;

  const totalValue = challan.totalValue ?? (challan.items || []).reduce((s, i) => s + Number(i.lineTotal), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/challans" className="link">&larr; Back to Challans</Link>
          <h2>{challan.challanNumber}</h2>
          <Badge status={challan.status} />
        </div>
        {canWrite && challan.status === 'DRAFT' && (
          <div className="actions">
            <button className="btn btn-primary" disabled={actionLoading} onClick={handleConfirm}>Confirm</button>
            <button className="btn btn-danger" disabled={actionLoading} onClick={handleCancel}>Cancel</button>
          </div>
        )}
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="detail-grid">
        <div className="card">
          <h3>Challan Details</h3>
          <dl className="detail-list">
            <dt>Customer</dt><dd>{challan.customer?.customerName}</dd>
            <dt>Business</dt><dd>{challan.customer?.businessName || '-'}</dd>
            <dt>Created By</dt><dd>{challan.createdBy?.name}</dd>
            <dt>Created Date</dt><dd>{formatDateTime(challan.createdAt)}</dd>
            <dt>Total Quantity</dt><dd>{challan.totalQuantity}</dd>
            <dt>Total Value</dt><dd>{formatCurrency(totalValue)}</dd>
          </dl>
        </div>

        <div className="card">
          <h3>Items</h3>
          <table className="table">
            <thead>
              <tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr>
            </thead>
            <tbody>
              {(challan.items || []).map((item) => (
                <tr key={item.id}>
                  <td>{item.productNameSnapshot}</td>
                  <td><code>{item.skuSnapshot}</code></td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unitPriceSnapshot)}</td>
                  <td>{formatCurrency(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}><strong>Total</strong></td>
                <td><strong>{challan.totalQuantity}</strong></td>
                <td></td>
                <td><strong>{formatCurrency(totalValue)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
