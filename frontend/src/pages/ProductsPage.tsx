import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, Pagination, Modal, Alert, formatCurrency } from '../utils/helpers';

const emptyForm = {
  productName: '', sku: '', category: '', unitPrice: '', currentStock: '0', minimumStock: '0', warehouseLocation: '',
};

export default function ProductsPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('ADMIN', 'WAREHOUSE');
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const load = () => {
    setLoading(true);
    api.getProducts(page, 10, search)
      .then((res) => { setProducts(res.data); setTotalPages(res.pagination.totalPages); })
      .catch((err) => setAlert({ type: 'error', message: err.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, search]);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      productName: p.productName, sku: p.sku, category: p.category,
      unitPrice: String(p.unitPrice), currentStock: String(p.currentStock),
      minimumStock: String(p.minimumStock), warehouseLocation: p.warehouseLocation || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        productName: form.productName, sku: form.sku, category: form.category,
        unitPrice: parseFloat(form.unitPrice), currentStock: parseInt(form.currentStock),
        minimumStock: parseInt(form.minimumStock), warehouseLocation: form.warehouseLocation || undefined,
      };
      if (editId) {
        const { sku: _, ...updatePayload } = payload;
        await api.updateProduct(editId, updatePayload);
        setAlert({ type: 'success', message: 'Product updated' });
      } else {
        await api.createProduct(payload);
        setAlert({ type: 'success', message: 'Product created' });
      }
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setAlert({ type: 'error', message: apiErr.message || 'Failed to save' });
    }
  };

  return (
    <div>
      <div className="page-header">
        <div><h2>Products</h2><p>Inventory product catalog</p></div>
        {canWrite && <button className="btn btn-primary" onClick={openCreate}>Add Product</button>}
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="toolbar">
        <input className="search-input" placeholder="Search products..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="card">
        {loading ? <LoadingSpinner /> : (
          <table className="table">
            <thead>
              <tr>
                <th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Min Stock</th><th>Warehouse</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-muted">No products found</td></tr>
              ) : products.map((p) => (
                <tr key={p.id} className={p.isLowStock ? 'row-warning' : ''}>
                  <td>{p.productName}</td>
                  <td><code>{p.sku}</code></td>
                  <td>{p.category}</td>
                  <td>{formatCurrency(p.unitPrice)}</td>
                  <td className={p.isLowStock ? 'text-danger font-bold' : ''}>{p.currentStock}</td>
                  <td>{p.minimumStock}</td>
                  <td>{p.warehouseLocation || '-'}</td>
                  <td>{p.isLowStock ? <span className="badge badge-danger">Low Stock</span> : <span className="badge badge-success">OK</span>}</td>
                  <td>{canWrite && <button className="btn btn-sm btn-outline" onClick={() => openEdit(p)}>Edit</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Product Name *</label><input required value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} /></div>
            <div className="form-group"><label>SKU *</label><input required disabled={!!editId} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Category *</label><input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div className="form-group"><label>Unit Price *</label><input type="number" step="0.01" required value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Current Stock</label><input type="number" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} /></div>
            <div className="form-group"><label>Minimum Stock</label><input type="number" value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: e.target.value })} /></div>
          </div>
          <div className="form-group"><label>Warehouse Location</label><input value={form.warehouseLocation} onChange={(e) => setForm({ ...form, warehouseLocation: e.target.value })} /></div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
