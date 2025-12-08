import React, { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { API_URL } from '../config'
import { Link } from 'react-router-dom'

export default function Usage(){
  const { token } = useAuth()
  const [stats, setStats] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if(!token) return
    fetchData()
  }, [token])

  async function fetchData(){
    setLoading(true)
    try {
      const [statsRes, invoicesRes] = await Promise.all([
        fetch(`${API_URL}/usage/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/invoices`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])
      
      if(statsRes.ok){
        const data = await statsRes.json()
        setStats(data)
      }
      
      if(invoicesRes.ok){
        const data = await invoicesRes.json()
        setInvoices(data)
      }
    } catch(err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  if(loading) return <div className="dashboard-loading">Đang tải...</div>

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <div className="page-header">
          <div>
            <h1>Thống kê & Sử dụng</h1>
            <p className="page-subtitle">Xem tổng quan về việc sử dụng dịch vụ của bạn</p>
          </div>
        </div>

        {stats && (
          <div className="usage-stats-grid">
            <div className="stat-card-large">
              <div className="stat-icon-large">🗄️</div>
              <div className="stat-content-large">
                <div className="stat-value-large">{stats.total_databases}</div>
                <div className="stat-title-large">Tổng số Database</div>
                <div className="stat-subtitle">{stats.active_databases} đang hoạt động</div>
              </div>
            </div>

            <div className="stat-card-large">
              <div className="stat-icon-large">💾</div>
              <div className="stat-content-large">
                <div className="stat-value-large">
                  {stats.total_storage_mb >= 1024 
                    ? `${(stats.total_storage_mb / 1024).toFixed(2)} GB` 
                    : `${stats.total_storage_mb} MB`}
                </div>
                <div className="stat-title-large">Tổng dung lượng</div>
                <div className="stat-subtitle">
                  Đã dùng: {stats.used_storage_mb >= 1024 
                    ? `${(stats.used_storage_mb / 1024).toFixed(2)} GB` 
                    : `${stats.used_storage_mb.toFixed(2)} MB`}
                </div>
              </div>
            </div>

            <div className="stat-card-large">
              <div className="stat-icon-large">💳</div>
              <div className="stat-content-large">
                <div className="stat-value-large">{formatCurrency(stats.total_spent_cents)}</div>
                <div className="stat-title-large">Tổng chi tiêu</div>
                <div className="stat-subtitle">{stats.total_payments} giao dịch</div>
              </div>
            </div>

            <div className="stat-card-large">
              <div className="stat-icon-large">📦</div>
              <div className="stat-content-large">
                <div className="stat-value-large">{stats.active_subscriptions}</div>
                <div className="stat-title-large">Gói đang dùng</div>
                <div className="stat-subtitle">Subscription active</div>
              </div>
            </div>
          </div>
        )}

        <div className="usage-sections">
          <section className="usage-section">
            <h2>Hóa đơn</h2>
            {invoices.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📄</div>
                <h3>Chưa có hóa đơn nào</h3>
                <p>Các hóa đơn từ subscription sẽ hiển thị tại đây</p>
              </div>
            ) : (
              <div className="invoices-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Số tiền</th>
                      <th>Kỳ hạn</th>
                      <th>Trạng thái</th>
                      <th>Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id}>
                        <td>#{inv.id}</td>
                        <td>{formatCurrency(inv.amount_cents)}</td>
                        <td>
                          {inv.period_start && inv.period_end ? (
                            <span>
                              {new Date(inv.period_start).toLocaleDateString('vi-VN')} - {new Date(inv.period_end).toLocaleDateString('vi-VN')}
                            </span>
                          ) : (
                            <span>-</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge badge-${inv.status.toLowerCase()}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td>{inv.created_at ? new Date(inv.created_at).toLocaleString('vi-VN') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function formatCurrency(cents){
  if(!cents || cents === 0) return '0₫'
  return `${Number(cents).toLocaleString('vi-VN')}₫`
}

function Sidebar(){
  const { clearToken } = useAuth()
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>CloudDB</h2>
      </div>
      <nav className="sidebar-nav">
        <Link to="/app" className="nav-item">
          <span className="nav-icon">🏠</span>
          <span>Trang chủ</span>
        </Link>
        <Link to="/app/databases" className="nav-item">
          <span className="nav-icon">🗄️</span>
          <span>Quản lý Database</span>
        </Link>
        <Link to="/app/subscriptions" className="nav-item">
          <span className="nav-icon">📦</span>
          <span>Gói dịch vụ</span>
        </Link>
        <Link to="/app/payments" className="nav-item">
          <span className="nav-icon">💳</span>
          <span>Thanh toán</span>
        </Link>
        <Link to="/app/usage" className="nav-item active">
          <span className="nav-icon">📊</span>
          <span>Thống kê</span>
        </Link>
        <Link to="/app/profile" className="nav-item">
          <span className="nav-icon">👤</span>
          <span>Tài khoản</span>
        </Link>
      </nav>
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={() => { clearToken(); window.location.href = '/login' }}>
          <span className="nav-icon">🚪</span>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  )
}

