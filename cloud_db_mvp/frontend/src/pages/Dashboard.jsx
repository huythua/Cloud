import React, { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { API_URL } from '../config'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import { ErrorMessage, SuccessMessage } from '../components/ErrorMessage'
import { FiHome, FiDatabase, FiPackage, FiCreditCard, FiBarChart2, FiUser, FiLogOut, FiPlus, FiDollarSign, FiStar, FiCheckCircle, FiActivity } from 'react-icons/fi'

export default function Dashboard(){
  const { token, clearToken, refreshUser } = useAuth()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({ databases: 0, activeDatabases: 0, activeSubscriptions: 0, balance: 0, points: 0, totalSpent: 0 })
  const [loading, setLoading] = useState(true)
  const [showConvertPointsModal, setShowConvertPointsModal] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    if(!token) return
    fetchUser()
    fetchStats()
  }, [token])

  async function fetchUser(){
    try {
      const res = await fetch(`${API_URL}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if(res.ok){
        const data = await res.json()
        setUser(data)
      }
    } catch(err) {
      console.error('Failed to fetch user:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats(){
    try {
      const [dbsRes, subsRes, usageRes] = await Promise.all([
        fetch(`${API_URL}/db/list`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/subscriptions/active`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
        fetch(`${API_URL}/usage/stats`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null)
      ])
      
      const dbs = dbsRes.ok ? await dbsRes.json() : []
      const activeSub = subsRes?.ok ? await subsRes.json() : null
      const usage = usageRes?.ok ? await usageRes.json() : null
      
      setStats({
        databases: usage?.total_databases || dbs.length,
        activeDatabases: usage?.active_databases || dbs.filter(db => db.status === 'ACTIVE').length,
        activeSubscriptions: usage?.active_subscriptions || (activeSub ? 1 : 0),
        balance: user?.balance_cents || 0,
        points: user?.points || 0,
        totalSpent: usage?.total_spent_cents || 0
      })
    } catch(err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  useEffect(() => {
    if(user) fetchStats()
  }, [user])

  if(loading) return <div className="dashboard-loading">Đang tải...</div>

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <div className="dashboard-header">
          <h1>Bảng điều khiển</h1>
          <p className="dashboard-subtitle">Chào mừng trở lại! Đây là tổng quan hệ thống của bạn.</p>
        </div>

        <div className="stats-grid">
          <Link to="/app/payments" style={{ textDecoration: 'none', color: 'inherit' }}>
            <StatCard 
              title="Số dư tài khoản" 
              value={formatCurrency(stats.balance)} 
              icon={<FiDollarSign size={24} />}
              color="#10b981"
              clickable={true}
            />
          </Link>
          <StatCard 
            title="Điểm tích lũy" 
            value={stats.points.toLocaleString()} 
            icon={<FiStar size={24} />}
            color="#f59e0b"
            onClick={() => stats.points > 0 && setShowConvertPointsModal(true)}
            clickable={stats.points > 0}
          />
          <Link to="/app/databases" style={{ textDecoration: 'none', color: 'inherit' }}>
            <StatCard 
              title="Database đang dùng" 
              value={`${stats.activeDatabases}/${stats.databases}`} 
              icon={<FiDatabase size={24} />}
              color="#3b82f6"
              clickable={true}
            />
          </Link>
          <Link to="/app/subscriptions" style={{ textDecoration: 'none', color: 'inherit' }}>
            <StatCard 
              title="Gói đang dùng" 
              value={stats.activeSubscriptions} 
              icon={<FiPackage size={24} />}
              color="#8b5cf6"
              clickable={true}
            />
          </Link>
        </div>

        {error && <ErrorMessage message={error} onClose={() => setError(null)} />}
        {success && <SuccessMessage message={success} onClose={() => setSuccess(null)} autoClose={true} />}

        {showConvertPointsModal && (
          <ConvertPointsModal 
            onClose={() => setShowConvertPointsModal(false)}
            onSuccess={async (message) => {
              if (message) setSuccess(message)
              setShowConvertPointsModal(false)
              await fetchUser()
              await fetchStats()
              if (refreshUser) refreshUser()
            }}
            token={token}
            currentPoints={stats.points}
          />
        )}

        <div className="dashboard-sections">
          <div className="dashboard-section">
            <h3>Thao tác nhanh</h3>
            <QuickActions />
          </div>
          <div className="dashboard-section">
            <h3>Hoạt động gần đây</h3>
            <RecentActivity token={token} />
          </div>
        </div>
        <Footer />
      </div>
    </div>
  )
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
        <Link to="/app" className="nav-item active">
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
        <Link to="/app/usage" className="nav-item">
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

function StatCard({ title, value, icon, color, onClick, clickable }){
  return (
    <div 
      className="stat-card" 
      style={{ 
        borderTopColor: color,
        cursor: clickable ? 'pointer' : 'default',
        transition: clickable ? 'transform 0.2s' : 'none'
      }}
      onClick={onClick}
      onMouseEnter={clickable ? (e) => e.currentTarget.style.transform = 'translateY(-2px)' : undefined}
      onMouseLeave={clickable ? (e) => e.currentTarget.style.transform = 'translateY(0)' : undefined}
    >
      <div className="stat-icon" style={{ backgroundColor: color + '20' }}>
        {icon}
      </div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-title">{title}</div>
        {clickable && <div style={{fontSize: '11px', color: '#64748b', marginTop: '4px'}}>Click để đổi điểm</div>}
      </div>
    </div>
  )
}

function QuickActions(){
  return (
    <div className="quick-actions">
      <Link to="/app/databases?action=create" className="action-card">
        <div className="action-icon"><FiPlus size={24} /></div>
        <div className="action-title">Tạo Database mới</div>
        <div className="action-desc">Khởi tạo database cloud mới</div>
      </Link>
      <Link to="/app/subscriptions" className="action-card">
        <div className="action-icon"><FiPackage size={24} /></div>
        <div className="action-title">Đăng ký gói</div>
        <div className="action-desc">Chọn và đăng ký gói dịch vụ</div>
      </Link>
      <Link to="/app/payments" className="action-card">
        <div className="action-icon"><FiCreditCard size={24} /></div>
        <div className="action-title">Nạp tiền</div>
        <div className="action-desc">Nạp tiền vào tài khoản</div>
      </Link>
    </div>
  )
}

function RecentActivity({ token }){
  const [items, setItems] = React.useState([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if(!token) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [paymentsRes, dbsRes, subRes] = await Promise.all([
          fetch(`${API_URL}/payments`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_URL}/db/list`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_URL}/subscriptions/active`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null)
        ])

        const activities = []

        if (paymentsRes.ok) {
          const payments = await paymentsRes.json()
          payments.slice(-5).reverse().forEach(p => {
            activities.push({
              type: 'payment',
              icon: <FiCreditCard size={16} />,
              title: `Nạp ${formatCurrency(p.amount_cents)}`,
              desc: `Trạng thái: ${p.status}`,
              time: p.created_at
            })
          })
        }

        if (dbsRes.ok) {
          const dbs = await dbsRes.json()
          dbs.slice(-5).reverse().forEach(d => {
            activities.push({
              type: 'database',
              icon: <FiDatabase size={16} />,
              title: `Database ${d.name}`,
              desc: `Trạng thái: ${d.status}`,
              time: d.created_at
            })
          })
        }

        if (subRes && subRes.ok) {
          const sub = await subRes.json()
          activities.push({
            type: 'subscription',
            icon: <FiPackage size={16} />,
            title: `Gói dịch vụ #${sub.plan_id}`,
            desc: `Trạng thái: ${sub.status}`,
            time: sub.started_at || sub.created_at
          })
        }

        activities.sort((a, b) => {
          const ta = a.time ? new Date(a.time).getTime() : 0
          const tb = b.time ? new Date(b.time).getTime() : 0
          return tb - ta
        })

        if (!cancelled) setItems(activities.slice(0, 6))
      } catch (e) {
        console.error('Failed to load recent activity', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token])

  if (loading) {
    return <div className="activity-list"><div className="activity-item">Đang tải hoạt động...</div></div>
  }

  if (!items.length) {
    return (
      <div className="activity-list">
        <div className="activity-item">
          <div className="activity-icon"><FiBarChart2 size={20} /></div>
          <div className="activity-content">
            <div className="activity-title">Chưa có hoạt động</div>
            <div className="activity-desc">Bắt đầu bằng việc nạp tiền, đăng ký gói hoặc tạo database mới.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="activity-list">
      {items.map((a, idx) => (
        <div key={idx} className="activity-item">
          <div className="activity-icon">{a.icon}</div>
          <div className="activity-content">
            <div className="activity-title">{a.title}</div>
            <div className="activity-desc">
              {a.desc}
              {a.time && (
                <span style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  {new Date(a.time).toLocaleString('vi-VN')}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ConvertPointsModal({ onClose, onSuccess, token, currentPoints }){
  const [pointsToConvert, setPointsToConvert] = React.useState(currentPoints || 0)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(null)

  async function handleSubmit(e){
    e.preventDefault()
    if(pointsToConvert <= 0){
      setError('Số điểm phải lớn hơn 0')
      return
    }
    if(pointsToConvert > currentPoints){
      setError('Bạn không có đủ điểm để đổi')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/points/convert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ points: pointsToConvert })
      })
      const data = await res.json()
      if(res.ok){
        const money = data.amount_cents || 0
        // Success sẽ được hiển thị qua parent component
        onSuccess && onSuccess(`Đổi điểm thành công! Đã đổi ${data.converted_points.toLocaleString('vi-VN')} điểm lấy ${Number(money).toLocaleString('vi-VN')}₫`)
      } else {
        setError(data.detail || 'Đổi điểm thất bại')
      }
    } catch(err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Đổi điểm sang tiền</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>Điểm hiện có</label>
            <div style={{ fontWeight: 600 }}>{currentPoints.toLocaleString('vi-VN')} điểm</div>
            <p className="hint" style={{marginTop: '4px', fontSize: '12px', color: '#64748b'}}>
              Tỉ lệ quy đổi: 1 điểm = 10₫
            </p>
          </div>
          <div className="form-group">
            <label>Số điểm muốn đổi</label>
            <input 
              type="number"
              min="1"
              max={currentPoints}
              value={pointsToConvert}
              onChange={e => setPointsToConvert(Math.max(0, Math.min(currentPoints, parseInt(e.target.value) || 0)))}
              required
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang đổi...' : 'Đổi điểm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function formatCurrency(cents){
  if(!cents || cents === 0) return '0₫'
  return `${Number(cents).toLocaleString('vi-VN')}₫`
}
