import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { SalesChallan } from '../types';
import { useAuth } from '../context/AuthContext';
import { Badge, LoadingSpinner, Pagination, Alert, formatCurrency, formatDateTime } from '../utils/helpers';

export default function ChallansPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('ADMIN', 'SALES');
  const [challans, setChallans] = useState<SalesChallan[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const load = () => {
    setLoading(true);
    api.getChallans(page, 10, search)
      .then((res) => { setChallans(res.data); setTotalPages(res.pagination.totalPages); })
      .catch((err) => setAlert({ type: 'error', message: err.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, search]);

  return (
    <div>
      <div className="page-header">
        <div><h2>Sales Challans</h2><p>Manage delivery challans</p></div>
        {canWrite && <Link to="/challans/new" className="btn btn-primary">Create Challan</Link>}
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="toolbar">
        <input className="search-input" placeholder="Search challan number or customer..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="card">
        {loading ? <LoadingSpinner /> : (
          <table className="table">
            <thead>
              <tr><th>Challan #</th><th>Customer</th><th>Quantity</th><th>Value</th><th>Status</th><th>Created By</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {challans.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-muted">No challans found</td></tr>
              ) : challans.map((c) => (
                <tr key={c.id}>
                  <td><Link to={`/challans/${c.id}`}>{c.challanNumber}</Link></td>
                  <td>{c.customer?.customerName}</td>
                  <td>{c.totalQuantity}</td>
                  <td>{c.totalValue ? formatCurrency(c.totalValue) : '-'}</td>
                  <td><Badge status={c.status} /></td>
                  <td>{c.createdBy?.name}</td>
                  <td>{formatDateTime(c.createdAt)}</td>
                  <td><Link to={`/challans/${c.id}`} className="btn btn-sm btn-outline">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
