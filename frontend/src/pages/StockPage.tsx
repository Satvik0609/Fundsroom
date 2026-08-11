import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Product, StockMovement } from '../types';
import { Badge, LoadingSpinner, Pagination, Modal, Alert, formatDateTime } from '../utils/helpers';

export default function StockPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ productId: '', quantityChanged: '', movementType: 'IN', reason: '' });
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.getAllMovements(page, 20),
      api.getProducts(1, 100),
    ])
      .then(([movRes, prodRes]) => {
        setMovements(movRes.data);
        setTotalPages(movRes.pagination.totalPages);
        setProducts(prodRes.data);
      })
      .catch((err) => setAlert({ type: 'error', message: err.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addStockMovement(form.productId, {
        quantityChanged: parseInt(form.quantityChanged),
        movementType: form.movementType,
        reason: form.reason,
      });
      setAlert({ type: 'success', message: 'Stock movement recorded' });
      setModalOpen(false);
      setForm({ productId: '', quantityChanged: '', movementType: 'IN', reason: '' });
      load();
    } catch (err: unknown) {
      const apiErr = err as { message?: string; details?: { available?: number; requested?: number } };
      let msg = apiErr.message || 'Failed';
      if (apiErr.details?.available !== undefined) {
        msg += ` (Available: ${apiErr.details.available}, Requested: ${apiErr.details.requested})`;
      }
      setAlert({ type: 'error', message: msg });
    }
  };

  return (
    <div>
      <div className="page-header">
        <div><h2>Stock Movements</h2><p>Track inventory IN/OUT movements</p></div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Record Movement</button>
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="card">
        {loading ? <LoadingSpinner /> : (
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Product</th><th>SKU</th><th>Type</th><th>Quantity</th><th>Reason</th><th>User</th></tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted">No movements yet</td></tr>
              ) : movements.map((m) => (
                <tr key={m.id}>
                  <td>{formatDateTime(m.createdAt)}</td>
                  <td>{m.product?.productName}</td>
                  <td><code>{m.product?.sku}</code></td>
                  <td><Badge status={m.movementType} /></td>
                  <td>{m.quantityChanged}</td>
                  <td>{m.reason}</td>
                  <td>{m.createdBy?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Stock Movement">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Product *</label>
            <select required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.productName} ({p.sku}) - Stock: {p.currentStock}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Type *</label>
              <select value={form.movementType} onChange={(e) => setForm({ ...form, movementType: e.target.value })}>
                <option value="IN">IN (Add stock)</option>
                <option value="OUT">OUT (Remove stock)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Quantity *</label>
              <input type="number" min="1" required value={form.quantityChanged} onChange={(e) => setForm({ ...form, quantityChanged: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Reason *</label>
            <input required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Record</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
