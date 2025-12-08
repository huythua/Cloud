import React, { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { API_URL } from '../config'
import { Link } from 'react-router-dom'

export default function Profile(){
  const { token } = useAuth()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    if(!token) return
    fetchUser()
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

  async function handleUpdateProfile(e){
    e.preventDefault()
    const formData = new FormData(e.target)
    const email = formData.get('email')
    
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`${API_URL}/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if(res.ok){
        setUser(data)
        setSuccess('Cập nhật thông tin thành công!')
      } else {
        setError(data.detail || 'Cập nhật thất bại')
      }
    } catch(err) {
      setError(String(err))
    }
  }

  async function handleChangePassword(e){
    e.preventDefault()
    const formData = new FormData(e.target)
    const oldPassword = formData.get('old_password')
    const newPassword = formData.get('new_password')
    const confirmPassword = formData.get('confirm_password')

    if(newPassword !== confirmPassword){
      setError('Mật khẩu mới không khớp')
      return
    }

    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`${API_URL}/me/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword
        })
      })
      const data = await res.json()
      if(res.ok){
        setSuccess('Đổi mật khẩu thành công!')
        setShowChangePassword(false)
        e.target.reset()
      } else {
        setError(data.detail || 'Đổi mật khẩu thất bại')
      }
    } catch(err) {
      setError(String(err))
    }
  }

  if(loading) return <div className="dashboard-loading">Đang tải...</div>
  if(!user) return <div className="dashboard-loading">Không tìm thấy thông tin user</div>

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <div className="page-header">
          <div>
            <h1>Tài khoản</h1>
            <p className="page-subtitle">Quản lý thông tin tài khoản và cài đặt</p>
          </div>
        </div>

        <div className="profile-sections">
          <section className="profile-section">
            <h2>Thông tin cá nhân</h2>
            <form onSubmit={handleUpdateProfile} className="form">
              {error && <div className="alert alert-error">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  name="email"
                  defaultValue={user.email}
                  required
                />
              </div>
              <div className="form-group">
                <label>ID</label>
                <input 
                  type="text" 
                  value={user.id}
                  disabled
                  className="input-disabled"
                />
              </div>
              <button type="submit" className="btn-primary">Cập nhật thông tin</button>
            </form>
          </section>

          <section className="profile-section">
            <h2>Tài chính</h2>
            <div className="profile-stats">
              <div className="stat-item">
                <div className="stat-label">Số dư</div>
                <div className="stat-value">{formatCurrency(user.balance_cents)}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Điểm tích lũy</div>
                <div className="stat-value">{user.points.toLocaleString('vi-VN')} điểm</div>
              </div>
            </div>
            <Link to="/app/payments" className="btn-secondary">
              Quản lý thanh toán
            </Link>
          </section>

          <section className="profile-section">
            <h2>Bảo mật</h2>
            {!showChangePassword ? (
              <button className="btn-primary" onClick={() => setShowChangePassword(true)}>
                Đổi mật khẩu
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="form">
                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}
                <div className="form-group">
                  <label>Mật khẩu cũ</label>
                  <input 
                    type="password" 
                    name="old_password"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Mật khẩu mới</label>
                  <input 
                    type="password" 
                    name="new_password"
                    required
                    minLength="6"
                  />
                </div>
                <div className="form-group">
                  <label>Xác nhận mật khẩu mới</label>
                  <input 
                    type="password" 
                    name="confirm_password"
                    required
                    minLength="6"
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => { setShowChangePassword(false); setError(null); setSuccess(null); }}>
                    Hủy
                  </button>
                  <button type="submit" className="btn-primary">Đổi mật khẩu</button>
                </div>
              </form>
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
        <Link to="/app/usage" className="nav-item">
          <span className="nav-icon">📊</span>
          <span>Thống kê</span>
        </Link>
        <Link to="/app/profile" className="nav-item active">
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

