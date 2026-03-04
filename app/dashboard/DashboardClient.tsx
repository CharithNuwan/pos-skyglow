'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardClient() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="text-center py-5">
      <span className="spinner-border text-primary" />
      <div className="mt-2 text-muted">Loading dashboard...</div>
    </div>
  );

  const todaySales = stats?.todaySales || {};
  const lowStock = stats?.lowStock || [];
  const recentSales = stats?.recentSales || [];
  const topProducts = stats?.topProducts || [];

  return (
    <div>
      {/* Stats Row */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-3">
          <div className="card stat-card p-3">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="stat-label">Today's Revenue</div>
                <div className="stat-value">${Number(todaySales.total_revenue ?? 0).toFixed(2)}</div>
              </div>
              <div className="rounded-3 p-2" style={{ background: '#e8f4fd', color: '#0d6efd' }}>
                <i className="bi bi-currency-dollar fs-4" />
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-xl-3">
          <div className="card stat-card green p-3">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="stat-label">Today's Orders</div>
                <div className="stat-value">{todaySales.total_orders ?? 0}</div>
              </div>
              <div className="rounded-3 p-2" style={{ background: '#e8f8f1', color: '#198754' }}>
                <i className="bi bi-bag-check fs-4" />
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-xl-3">
          <div className="card stat-card orange p-3">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="stat-label">Total Products</div>
                <div className="stat-value">{stats?.totalProducts ?? 0}</div>
              </div>
              <div className="rounded-3 p-2" style={{ background: '#fff3e8', color: '#fd7e14' }}>
                <i className="bi bi-box-seam fs-4" />
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-xl-3">
          <div className="card stat-card red p-3">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="stat-label">Low Stock Alerts</div>
                <div className="stat-value">{lowStock.length}</div>
              </div>
              <div className="rounded-3 p-2" style={{ background: '#fde8e8', color: '#dc3545' }}>
                <i className="bi bi-exclamation-triangle fs-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        {/* Recent Sales */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>Recent Sales</span>
              <Link href="/sales" className="btn btn-sm btn-outline-primary">View All</Link>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr><th>Invoice</th><th>Cashier</th><th>Method</th><th>Amount</th><th>Status</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {recentSales.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-muted py-4">No sales yet</td></tr>
                    ) : recentSales.map((sale: any) => (
                      <tr key={sale.invoice_number}>
                        <td className="fw-500">{sale.invoice_number}</td>
                        <td>{sale.cashier_name}</td>
                        <td className="text-capitalize">{sale.payment_method}</td>
                        <td className="fw-600">${Number(sale.total_amount).toFixed(2)}</td>
                        <td><span className={`badge status-${sale.payment_status}`}>{sale.payment_status}</span></td>
                        <td className="text-muted small">{new Date(sale.sale_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock */}
        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>Low Stock Alerts</span>
              <Link href="/products" className="btn btn-sm btn-outline-warning">Manage</Link>
            </div>
            <div className="card-body p-0">
              {lowStock.length === 0 ? (
                <div className="p-4 text-center text-muted">
                  <i className="bi bi-check-circle text-success fs-2 d-block mb-2" />
                  All stock levels OK
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {lowStock.map((p: any) => (
                    <li key={p.product_name} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-500 small">{p.product_name}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{p.category_name}</div>
                      </div>
                      <span className="low-stock-badge">{p.quantity} left</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">Top Products (30 Days)</div>
            <div className="card-body p-0">
              <table className="table mb-0">
                <thead><tr><th>Product</th><th>Sold</th><th>Revenue</th></tr></thead>
                <tbody>
                  {topProducts.length === 0 ? (
                    <tr><td colSpan={3} className="text-center text-muted py-3">No data yet</td></tr>
                  ) : topProducts.map((p: any) => (
                    <tr key={p.product_name}>
                      <td className="fw-500">{p.product_name}</td>
                      <td>{p.total_sold}</td>
                      <td>${Number(p.total_revenue).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">Quick Actions</div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <Link href="/pos" className="btn btn-primary">
                  <i className="bi bi-cart-plus me-2" />New Sale
                </Link>
                <Link href="/products" className="btn btn-outline-secondary">
                  <i className="bi bi-plus-circle me-2" />Add Product
                </Link>
                <Link href="/reports" className="btn btn-outline-secondary">
                  <i className="bi bi-bar-chart me-2" />View Reports
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
