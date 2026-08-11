import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Customer, Product } from '../types';
import { Alert, formatCurrency } from '../utils/helpers';

interface LineItem {
  productId: string;
  productName: string;
  sku: string;
  availableStock: number;
  unitPrice: number;
  quantity: number;
}

export default function CreateChallanPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState<LineItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getCustomers(1, 100),
      api.getProducts(1, 100),
    ]).then(([cRes, pRes]) => {
      setCustomers(cRes.data);
      setProducts(pRes.data);
    });
  }, []);

  const addLine = () => {
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;
    if (lines.some((l) => l.productId === product.id)) {
      setAlert({ type: 'error', message: 'Product already added' });
      return;
    }
    setLines([...lines, {
      productId: product.id,
      productName: product.productName,
      sku: product.sku,
      availableStock: product.currentStock,
      unitPrice: Number(product.unitPrice),
      quantity: 1,
    }]);
    setSelectedProduct('');
  };

  const updateQty = (idx: number, qty: number) => {
    const updated = [...lines];
    updated[idx].quantity = Math.max(1, qty);
    setLines(updated);
  };

  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));

  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
  const totalValue = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  const save = async (confirm: boolean) => {
    if (!customerId || lines.length === 0) {
      setAlert({ type: 'error', message: 'Select customer and add at least one product' });
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      const payload = {
        customerId,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        status: 'DRAFT',
      };
      const res = await api.createChallan(payload);
      if (confirm) {
        try {
          await api.confirmChallan(res.data.id);
          setAlert({ type: 'success', message: 'Challan created and confirmed successfully' });
        } catch (err: unknown) {
          const apiErr = err as { message?: string; details?: { available?: number; requested?: number; productName?: string } };
          let msg = apiErr.message || 'Confirmation failed';
          if (apiErr.details?.available !== undefined) {
            msg += ` — Available: ${apiErr.details.available}, Requested: ${apiErr.details.requested}`;
          }
          setAlert({ type: 'error', message: msg });
          navigate(`/challans/${res.data.id}`);
          return;
        }
      } else {
        setAlert({ type: 'success', message: 'Draft challan saved' });
      }
      navigate(`/challans/${res.data.id}`);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setAlert({ type: 'error', message: apiErr.message || 'Failed to create challan' });
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Create Sales Challan</h2>
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="card">
        <div className="form-group">
          <label>Customer *</label>
          <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.customerName} {c.businessName ? `(${c.businessName})` : ''}</option>
            ))}
          </select>
        </div>

        <div className="challan-add-product">
          <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
            <option value="">Select product to add</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.productName} ({p.sku}) - Stock: {p.currentStock}</option>
            ))}
          </select>
          <button type="button" className="btn btn-outline" onClick={addLine} disabled={!selectedProduct}>Add Product</button>
        </div>

        {lines.length > 0 && (
          <table className="table">
            <thead>
              <tr><th>Product</th><th>SKU</th><th>Available</th><th>Quantity</th><th>Unit Price</th><th>Line Total</th><th></th></tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={l.productId}>
                  <td>{l.productName}</td>
                  <td><code>{l.sku}</code></td>
                  <td>{l.availableStock}</td>
                  <td><input type="number" min="1" className="qty-input" value={l.quantity} onChange={(e) => updateQty(idx, parseInt(e.target.value) || 1)} /></td>
                  <td>{formatCurrency(l.unitPrice)}</td>
                  <td>{formatCurrency(l.quantity * l.unitPrice)}</td>
                  <td><button className="btn btn-sm btn-danger" onClick={() => removeLine(idx)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={3}><strong>Total</strong></td><td><strong>{totalQty}</strong></td><td></td><td><strong>{formatCurrency(totalValue)}</strong></td><td></td></tr>
            </tfoot>
          </table>
        )}

        <div className="form-actions">
          <button className="btn btn-outline" onClick={() => navigate('/challans')}>Cancel</button>
          <button className="btn btn-secondary" disabled={loading} onClick={() => save(false)}>Save Draft</button>
          <button className="btn btn-primary" disabled={loading} onClick={() => setConfirmOpen(true)}>Confirm Challan</button>
        </div>
      </div>

      {confirmOpen && (
        <div className="modal-overlay" onClick={() => setConfirmOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Confirm Challan</h3></div>
            <div className="modal-body">
              <p>This will confirm the challan and deduct stock from inventory. This action cannot be undone.</p>
              <p><strong>Total Quantity:</strong> {totalQty} | <strong>Total Value:</strong> {formatCurrency(totalValue)}</p>
              <div className="form-actions">
                <button className="btn btn-outline" onClick={() => setConfirmOpen(false)}>Cancel</button>
                <button className="btn btn-primary" disabled={loading} onClick={() => save(true)}>{loading ? 'Processing...' : 'Confirm'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
