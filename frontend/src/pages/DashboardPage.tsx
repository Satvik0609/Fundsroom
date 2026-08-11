import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { DashboardStats } from '../types';
import { Badge, LoadingSpinner, formatDateTime } from '../utils/helpers';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDashboard()
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!stats) return null;

  const cards = [
    { label: 'Total Customers', value: stats.totalCustomers, color: 'blue' },
    { label: 'Active Customers', value: stats.activeCustomers, color: 'green' },
    { label: 'Total Products', value: stats.totalProducts, color: 'purple' },
    { label: 'Low Stock Items', value: stats.lowStockProducts, color: 'red' },
    { label: 'Total Stock Qty', value: stats.totalStockQuantity, color: 'teal' },
    { label: 'Draft Challans', value: stats.draftChallans, color: 'orange' },
    { label: 'Confirmed Challans', value: stats.confirmedChallans, color: 'green' },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of your operations</p>
      </div>

      <div className="stats-grid">
        {cards.map((card) => (
          <div key={card.label} className={`stat-card stat-${card.color}`}>
            <span className="stat-label">{card.label}</span>
            <span className="stat-value">{card.value}</span>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h3>Recent Challans</h3>
            <Link to="/challans" className="link">View all</Link>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Challan #</th>
                <th>Customer</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentChallans.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted">No challans yet</td></tr>
              ) : stats.recentChallans.map((c) => (
                <tr key={c.id}>
                  <td><Link to={`/challans/${c.id}`}>{c.challanNumber}</Link></td>
                  <td>{c.customer?.customerName}</td>
                  <td>{c.totalQuantity}</td>
                  <td><Badge status={c.status} /></td>
                  <td>{formatDateTime(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Recent Stock Movements</h3>
            <Link to="/stock" className="link">View all</Link>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th>Qty</th>
                <th>User</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentMovements.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted">No movements yet</td></tr>
              ) : stats.recentMovements.map((m) => (
                <tr key={m.id}>
                  <td>{m.product?.productName}</td>
                  <td><Badge status={m.movementType} /></td>
                  <td>{m.quantityChanged}</td>
                  <td>{m.createdBy?.name}</td>
                  <td>{formatDateTime(m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
