import React, { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { API_URL } from '../config'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import { ErrorMessage } from '../components/ErrorMessage'
import { FiDatabase, FiHardDrive, FiCreditCard, FiPackage, FiHome, FiBarChart2, FiUser, FiLogOut } from 'react-icons/fi'

export default function Usage(){
  const { token } = useAuth()
  const [stats, setStats] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
      } else {
        const errorData = await statsRes.json().catch(() => ({}))
        console.error('Failed to fetch stats:', errorData)
      }
      
      if(invoicesRes.ok){
        const data = await invoicesRes.json()
        setInvoices(data)
      } else {
        const errorData = await invoicesRes.json().catch(() => ({}))
        console.error('Failed to fetch invoices:', errorData)
        // Không set error nếu invoices fail, chỉ log
      }
    } catch(err) {
      setError('Lỗi kết nối: ' + err.message)
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

        {error && <ErrorMessage message={error} onClose={() => setError(null)} />}

        {stats && (
          <div className="usage-stats-grid">
            <div className="stat-card-large">
              <FiDatabase size={32} style={{ color: '#3b82f6' }} />
              <div className="stat-content-large">
                <div className="stat-value-large">{stats.total_databases}</div>
                <div className="stat-title-large">Tổng số Database</div>
                <div className="stat-subtitle">{stats.active_databases} đang hoạt động</div>
              </div>
            </div>

            <div className="stat-card-large">
              <FiHardDrive size={32} style={{ color: '#10b981' }} />
              <div className="stat-content-large">
                <div className="stat-value-large">
                  {stats.plan_storage_mb >= 1024 
                    ? `${(stats.plan_storage_mb / 1024).toFixed(2)} GB` 
                    : `${stats.plan_storage_mb} MB`}
                </div>
                <div className="stat-title-large">Dung lượng gói</div>
                <div className="stat-subtitle">
                  Đã dùng: {stats.total_used_storage_mb >= 1024 
                    ? `${(stats.total_used_storage_mb / 1024).toFixed(2)} GB` 
                    : `${stats.total_used_storage_mb.toFixed(2)} MB`}
                </div>
              </div>
            </div>

            <div className="stat-card-large">
              <FiCreditCard size={32} style={{ color: '#8b5cf6' }} />
              <div className="stat-content-large">
                <div className="stat-value-large">{formatCurrency(stats.total_spent_cents)}</div>
                <div className="stat-title-large">Tổng chi tiêu</div>
                <div className="stat-subtitle">{invoices.length} giao dịch</div>
              </div>
            </div>

            <div className="stat-card-large">
              <FiPackage size={32} style={{ color: '#f59e0b' }} />
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
                      <th>Phương thức</th>
                      <th>Mô tả</th>
                      <th>Trạng thái</th>
                      <th>Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id}>
                        <td>#{inv.id}</td>
                        <td>{formatCurrency(inv.amount_cents)}</td>
                        <td>{inv.payment_method || '-'}</td>
                        <td>{inv.description || '-'}</td>
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
        <Footer />
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
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'
          }}>
            <FiDatabase size={24} style={{ color: 'white' }} />
          </div>
          <h2 style={{margin: 0, fontSize: '24px', fontWeight: '700', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>CloudDB</h2>
        </div>
      </div>
      <nav className="sidebar-nav">
        <Link to="/app" className="nav-item">
          <span className="nav-icon"><FiHome size={18} /></span>
          <span>Trang chủ</span>
        </Link>
        <Link to="/app/databases" className="nav-item">
          <span className="nav-icon"><FiDatabase size={18} /></span>
          <span>Quản lý Database</span>
        </Link>
        <Link to="/app/subscriptions" className="nav-item">
          <span className="nav-icon"><FiPackage size={18} /></span>
          <span>Gói dịch vụ</span>
        </Link>
        <Link to="/app/payments" className="nav-item">
          <span className="nav-icon"><FiCreditCard size={18} /></span>
          <span>Thanh toán</span>
        </Link>
        <Link to="/app/usage" className="nav-item active">
          <span className="nav-icon"><FiBarChart2 size={18} /></span>
          <span>Thống kê</span>
        </Link>
        <Link to="/app/profile" className="nav-item">
          <span className="nav-icon"><FiUser size={18} /></span>
          <span>Tài khoản</span>
        </Link>
      </nav>
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={() => { clearToken(); window.location.href = '/login' }}>
          <span className="nav-icon"><FiLogOut size={18} /></span>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  )
}

