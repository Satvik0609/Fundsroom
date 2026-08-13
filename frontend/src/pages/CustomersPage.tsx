import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Customer, CustomerType, CustomerStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { Badge, LoadingSpinner, Pagination, Modal, Alert, formatDate } from '../utils/helpers';

const emptyForm = {
  customerName: '', mobileNumber: '', email: '', businessName: '', gstNumber: '',
  customerType: 'RETAIL' as CustomerType, address: '', status: 'LEAD' as CustomerStatus,
  followUpDate: '', notes: '',
};

export default function CustomersPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('ADMIN', 'SALES');
  const [customers, setCustomers] = useState<Customer[]>([]);
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
    api.getCustomers(page, 10, search)
      .then((res) => { setCustomers(res.data); setTotalPages(res.pagination.totalPages); })
      .catch((err) => setAlert({ type: 'error', message: err.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, search]);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (c: Customer) => {
    setEditId(c.id);
    setForm({
      customerName: c.customerName, mobileNumber: c.mobileNumber,
      email: c.email || '', businessName: c.businessName || '',
      gstNumber: c.gstNumber || '', customerType: c.customerType,
      address: c.address || '', status: c.status,
      followUpDate: c.followUpDate ? c.followUpDate.split('T')[0] : '', notes: c.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, unknown> = {
        customerName: form.customerName.trim(),
        mobileNumber: form.mobileNumber.trim(),
        customerType: form.customerType,
        status: form.status,
      };
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.businessName.trim()) payload.businessName = form.businessName.trim();
      if (form.gstNumber.trim()) payload.gstNumber = form.gstNumber.trim().toUpperCase();
      if (form.address.trim()) payload.address = form.address.trim();
      if (form.notes.trim()) payload.notes = form.notes.trim();
      if (form.followUpDate) payload.followUpDate = form.followUpDate;

      if (editId) {
        await api.updateCustomer(editId, payload);
        setAlert({ type: 'success', message: 'Customer updated' });
      } else {
        await api.createCustomer(payload);
        setAlert({ type: 'success', message: 'Customer created' });
      }
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      const apiErr = err as { message?: string; details?: Record<string, string[] | string> };
      let msg = apiErr.message || 'Failed to save';
      if (apiErr.details && typeof apiErr.details === 'object') {
        const fieldErrors = Object.entries(apiErr.details)
          .flatMap(([field, errors]) =>
            (Array.isArray(errors) ? errors : [String(errors)]).map((e) => `${field}: ${e}`)
          );
        if (fieldErrors.length > 0) msg = fieldErrors.join('; ');
      }
      setAlert({ type: 'error', message: msg });
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Customers</h2>
          <p>Manage customer CRM records</p>
        </div>
        {canWrite && <button className="btn btn-primary" onClick={openCreate}>Add Customer</button>}
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="toolbar">
        <input className="search-input" placeholder="Search by name, business, mobile, email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="card">
        {loading ? <LoadingSpinner /> : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th><th>Business</th><th>Mobile</th><th>Type</th><th>Status</th><th>Follow-up</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted">No customers found</td></tr>
              ) : customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.customerName}</td>
                  <td>{c.businessName || '-'}</td>
                  <td>{c.mobileNumber}</td>
                  <td><Badge status={c.customerType} /></td>
                  <td><Badge status={c.status} /></td>
                  <td>{c.followUpDate ? formatDate(c.followUpDate) : '-'}</td>
                  <td className="actions">
                    <Link to={`/customers/${c.id}`} className="btn btn-sm btn-outline">View</Link>
                    {canWrite && <button className="btn btn-sm btn-outline" onClick={() => openEdit(c)}>Edit</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Customer' : 'Add Customer'}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Customer Name *</label><input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></div>
            <div className="form-group"><label>Mobile *</label><input required pattern="[6-9][0-9]{9}" title="10-digit mobile starting with 6-9" value={form.mobileNumber} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form-group"><label>Business Name</label><input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>GST Number</label><input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} /></div>
            <div className="form-group"><label>Customer Type *</label>
              <select value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value as CustomerType })}>
                <option value="RETAIL">Retail</option><option value="WHOLESALE">Wholesale</option><option value="DISTRIBUTOR">Distributor</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CustomerStatus })}>
                <option value="LEAD">Lead</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="form-group"><label>Follow-up Date</label><input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} /></div>
          </div>
          <div className="form-group"><label>Address</label><textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} /></div>
          <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
