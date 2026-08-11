import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Customer } from '../types';
import { useAuth } from '../context/AuthContext';
import { Badge, LoadingSpinner, Alert, formatDate, formatDateTime } from '../utils/helpers';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const canWrite = hasRole('ADMIN', 'SALES');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const load = () => {
    if (!id) return;
    api.getCustomer(id)
      .then((res) => setCustomer(res.data))
      .catch((err) => setAlert({ type: 'error', message: err.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await api.addFollowUp(id, { note, followUpDate });
      setAlert({ type: 'success', message: 'Follow-up added' });
      setNote('');
      setFollowUpDate('');
      load();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setAlert({ type: 'error', message: apiErr.message || 'Failed' });
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!customer) return <div>Customer not found</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/customers" className="link">&larr; Back to Customers</Link>
          <h2>{customer.customerName}</h2>
          <Badge status={customer.status} />
        </div>
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="detail-grid">
        <div className="card">
          <h3>Basic Information</h3>
          <dl className="detail-list">
            <dt>Business</dt><dd>{customer.businessName || '-'}</dd>
            <dt>Mobile</dt><dd>{customer.mobileNumber}</dd>
            <dt>Email</dt><dd>{customer.email || '-'}</dd>
            <dt>Type</dt><dd><Badge status={customer.customerType} /></dd>
            <dt>GST</dt><dd>{customer.gstNumber || '-'}</dd>
            <dt>Address</dt><dd>{customer.address || '-'}</dd>
            <dt>Follow-up Date</dt><dd>{customer.followUpDate ? formatDate(customer.followUpDate) : '-'}</dd>
            <dt>Notes</dt><dd>{customer.notes || '-'}</dd>
            <dt>Created By</dt><dd>{customer.createdBy?.name || '-'}</dd>
          </dl>
        </div>

        <div className="card">
          <h3>Follow-up History</h3>
          {canWrite && (
            <form onSubmit={handleFollowUp} className="followup-form">
              <div className="form-group"><label>Note</label><textarea required value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></div>
              <div className="form-group"><label>Follow-up Date</label><input type="date" required value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} /></div>
              <button type="submit" className="btn btn-primary btn-sm">Add Follow-up</button>
            </form>
          )}
          <div className="followup-list">
            {(customer.followUps || []).length === 0 ? (
              <p className="text-muted">No follow-ups yet</p>
            ) : (customer.followUps || []).map((f) => (
              <div key={f.id} className="followup-item">
                <div className="followup-meta">{formatDateTime(f.createdAt)} &middot; {f.createdBy?.name}</div>
                <div>{f.note}</div>
                <div className="text-muted">Next: {formatDate(f.followUpDate)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
