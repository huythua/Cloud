import React, { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { API_URL } from '../config'
import { Link } from 'react-router-dom'

export default function Payments(){
  const { token, user, refreshUser } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    if(!token) return
    if(refreshUser) refreshUser()  // Sử dụng refreshUser từ context để đồng bộ
    fetchPayments()
  }, [token])

  async function fetchPayments(){
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/payments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if(res.ok){
        const data = await res.json()
        setPayments(data)
      }
    } catch(err) {
      console.error('Failed to fetch payments:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm(paymentId){
    try {
      const res = await fetch(`${API_URL}/payments/${paymentId}/confirm`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if(res.ok){
        alert('Xác nhận thanh toán thành công!')
        fetchPayments()
        if(refreshUser) refreshUser()  // Refresh user để cập nhật số dư và điểm
      } else {
        alert('Xác nhận thất bại')
      }
    } catch(err) {
      alert('Lỗi: ' + err)
    }
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <div className="page-header">
          <div>
            <h1>Thanh toán</h1>
            <p className="page-subtitle">Quản lý thanh toán và lịch sử giao dịch</p>
          </div>
          <button className="btn-primary" onClick={() => setShowCreateForm(true)}>
            💳 Tạo thanh toán
          </button>
        </div>

        {user && (
          <div className="balance-card">
            <div className="balance-info">
              <div className="balance-label">Số dư hiện tại</div>
              <div className="balance-value">{formatCurrency(user.balance_cents)}</div>
            </div>
            <div className="balance-info">
              <div className="balance-label">Điểm tích lũy</div>
              <div className="balance-value">{user.points.toLocaleString('vi-VN')} điểm</div>
            </div>
          </div>
        )}
        
        {user && user.balance_cents === 0 && (
          <div className="alert alert-info" style={{marginBottom: '24px'}}>
            💡 <strong>Gợi ý:</strong> Nạp tiền để có thể đăng ký gói dịch vụ và tạo database. Nạp tiền ảo sẽ tự động xác nhận ngay.
          </div>
        )}

        {showCreateForm && (
          <CreatePaymentForm 
            onClose={() => setShowCreateForm(false)} 
            onSuccess={() => { 
              setShowCreateForm(false); 
              fetchPayments(); 
              if(refreshUser) refreshUser();  // Refresh user từ context
            }}
            token={token}
          />
        )}

        <section className="payments-section">
          <h2>Lịch sử thanh toán</h2>
          {loading && <div className="loading">Đang tải...</div>}
          {!loading && payments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💳</div>
              <h3>Chưa có giao dịch nào</h3>
              <p>Tạo thanh toán mới để nạp tiền vào tài khoản</p>
            </div>
          ) : (
            <div className="payments-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Số tiền</th>
                    <th>Phương thức</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(payment => (
                    <tr key={payment.id}>
                      <td>#{payment.id}</td>
                      <td>{formatCurrency(payment.amount_cents)}</td>
                      <td>{payment.payment_method || 'N/A'}</td>
                      <td>
                        <span className={`badge badge-${payment.status.toLowerCase()}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td>{new Date(payment.created_at).toLocaleString('vi-VN')}</td>
                      <td>
                        {payment.status === 'PENDING' && payment.payment_method !== 'VIRTUAL' && (
                          <button 
                            className="btn-sm btn-primary"
                            onClick={() => handleConfirm(payment.id)}
                          >
                            Xác nhận
                          </button>
                        )}
                        {payment.status === 'COMPLETED' && (
                          <span className="badge badge-success">Đã hoàn thành</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="help-section" style={{marginTop: '32px'}}>
          <h2>Hướng dẫn & ghi chú</h2>
          <ul style={{fontSize: '13px', color: '#64748b', paddingLeft: '18px', marginTop: '8px', lineHeight: 1.6}}>
            <li><strong>Nạp tiền ảo:</strong> Chọn phương thức <strong>Nạp tiền ảo</strong> để hệ thống tự động xác nhận và cộng tiền ngay (phù hợp để test).</li>
            <li><strong>Điểm tích lũy:</strong> Mỗi lần nạp tiền bạn sẽ nhận được điểm thưởng. Điểm có thể đổi lại thành tiền ở <strong>Dashboard &gt; Điểm tích lũy</strong>.</li>
            <li><strong>Lịch sử giao dịch:</strong> Bảng phía trên giúp bạn theo dõi các lần nạp tiền, trạng thái và thời gian thực hiện.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

function CreatePaymentForm({ onClose, onSuccess, token }){
  const [formData, setFormData] = useState({
    amount_cents: 0,
    currency: 'VND',
    payment_method: 'VIRTUAL',
    description: 'Nạp tiền vào tài khoản'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e){
    e.preventDefault()
    if(formData.amount_cents <= 0){
      setError('Số tiền phải lớn hơn 0')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if(res.ok){
        const pointsMsg = data.points_earned ? `\n🎁 Nhận được ${data.points_earned.toLocaleString('vi-VN')} điểm tích lũy!` : ''
        alert(`✅ Nạp tiền thành công! Số dư đã được cập nhật.${pointsMsg}`)
        onSuccess()
      } else {
        setError(data.detail || 'Tạo thanh toán thất bại')
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
          <h2>Tạo thanh toán</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>Số tiền (VND)</label>
            <input 
              type="number" 
              value={formData.amount_cents}
              onChange={e => setFormData({...formData, amount_cents: parseInt(e.target.value) || 0})}
              required
              min="1000"
              step="1000"
              placeholder="100000"
            />
          </div>
          <div className="form-group">
            <label>Phương thức thanh toán</label>
            <select 
              value={formData.payment_method}
              onChange={e => setFormData({...formData, payment_method: e.target.value})}
            >
              <option value="VIRTUAL">Nạp tiền ảo (Tự động xác nhận)</option>
              <option value="BANK_TRANSFER">Chuyển khoản ngân hàng</option>
              <option value="CREDIT_CARD">Thẻ tín dụng</option>
              <option value="E_WALLET">Ví điện tử</option>
            </select>
            <p className="hint" style={{marginTop: '8px', fontSize: '12px', color: '#64748b'}}>
              💡 Nạp tiền ảo sẽ tự động xác nhận và cập nhật số dư ngay lập tức
            </p>
          </div>
          <div className="form-group">
            <label>Mô tả (tùy chọn)</label>
            <input 
              type="text" 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Nạp tiền vào tài khoản"
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo thanh toán'}
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
        <Link to="/app/payments" className="nav-item active">
          <span className="nav-icon">💳</span>
          <span>Thanh toán</span>
        </Link>
        <Link to="/app/usage" className="nav-item">
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

