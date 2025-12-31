import React, { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { API_URL } from '../config'
import { Link, useSearchParams } from 'react-router-dom'
import Footer from '../components/Footer'
import { ErrorMessage, SuccessMessage } from '../components/ErrorMessage'
import { FiCreditCard, FiZap, FiGift, FiHome, FiDatabase, FiPackage, FiBarChart2, FiUser, FiLogOut, FiRefreshCw, FiClock, FiClipboard, FiInfo, FiStar, FiX } from 'react-icons/fi'

export default function Payments(){
  const { token, user, refreshUser } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchParams] = useSearchParams()
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    if(!token) return
    if(refreshUser) refreshUser()  // Sử dụng refreshUser từ context để đồng bộ
    fetchPayments()
    
    // Xử lý callback từ VNPay
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const paymentId = searchParams.get('payment_id')
    
    if(success === 'true') {
      const paymentAmount = searchParams.get('amount')
      const pointsEarned = searchParams.get('points')
      let message = `Thanh toán thành công!`
      if(paymentId) message += `\n\nMã giao dịch: #${paymentId}`
      if(paymentAmount) message += `\nSố tiền: ${formatCurrency(parseInt(paymentAmount))}`
      if(pointsEarned) message += `\nĐiểm tích lũy nhận được: ${parseInt(pointsEarned).toLocaleString('vi-VN')} điểm`
      message += `\n\nSố dư của bạn đã được cập nhật tự động.`
      
      setSuccess(message)
      fetchPayments()
      if(refreshUser) refreshUser()
      // Xóa query params để tránh hiển thị lại
      window.history.replaceState({}, '', '/app/payments')
    } else if(error) {
      const errorCode = searchParams.get('code')
      const errorMsg = {
        'invalid_checksum': 'Checksum không hợp lệ. Vui lòng thử lại hoặc liên hệ hỗ trợ.',
        'invalid_order': 'Mã đơn hàng không hợp lệ. Vui lòng kiểm tra lại.',
        'payment_not_found': 'Không tìm thấy giao dịch. Vui lòng liên hệ hỗ trợ nếu đã thanh toán.',
        'payment_failed': `Thanh toán thất bại${errorCode ? ` (Mã lỗi: ${errorCode})` : ''}. Vui lòng thử lại hoặc chọn phương thức thanh toán khác.`,
        'payment_already_processed': 'Giao dịch này đã được xử lý trước đó.'
      }[error] || `Lỗi: ${error}${errorCode ? ` (Mã: ${errorCode})` : ''}`
      
      setError(errorMsg)
      window.history.replaceState({}, '', '/app/payments')
    }
  }, [token, searchParams])

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
      const data = await res.json()
      if(res.ok){
        setSuccess('Xác nhận thanh toán thành công! Số dư đã được cập nhật.')
        fetchPayments()
        if(refreshUser) refreshUser()  // Refresh user để cập nhật số dư và điểm
      } else {
        setError(data.detail || 'Xác nhận thất bại')
      }
    } catch(err) {
      setError('Lỗi kết nối: ' + err.message)
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
          <button className="btn-primary" onClick={() => setShowCreateForm(true)} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <FiCreditCard size={18} /> Tạo thanh toán
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
        
        {error && <ErrorMessage message={error} onClose={() => setError(null)} />}
        {success && <SuccessMessage message={success} onClose={() => setSuccess(null)} autoClose={true} />}
        
        {user && user.balance_cents === 0 && (
          <div className="alert alert-info" style={{marginBottom: '24px'}}>
            <FiInfo size={16} style={{marginRight: '6px', verticalAlign: 'middle'}} /> <strong>Gợi ý:</strong> Nạp tiền để có thể đăng ký gói dịch vụ và tạo database. Nạp tiền ảo sẽ tự động xác nhận ngay.
          </div>
        )}

        {/* VNPay Payment Card */}
        <div className="vnpay-card" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          color: 'white',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px'}}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              <FiCreditCard size={24} />
            </div>
            <div>
              <h3 style={{margin: 0, fontSize: '20px', fontWeight: '600'}}>Thanh toán qua VNPay</h3>
              <p style={{margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9}}>
                Hỗ trợ thẻ ATM, thẻ tín dụng, ví điện tử
              </p>
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '13px',
            marginTop: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <strong style={{display: 'flex', alignItems: 'center', gap: '6px'}}><FiStar size={14} /> Ưu điểm:</strong> Thanh toán nhanh chóng, bảo mật cao, hỗ trợ nhiều phương thức thanh toán. 
            Sau khi thanh toán thành công, số dư sẽ được cập nhật tự động.
          </div>
          <button 
            className="btn-primary" 
            onClick={() => setShowCreateForm(true)}
            style={{
              marginTop: '16px',
              background: 'white',
              color: '#667eea',
              border: 'none',
              fontWeight: '600'
            }}
          >
            <FiCreditCard size={18} style={{marginRight: '6px'}} /> Nạp tiền qua VNPay
          </button>
        </div>

        {showCreateForm && (
          <CreatePaymentForm 
            onClose={() => setShowCreateForm(false)} 
            onSuccess={(message) => { 
              if(message) setSuccess(message)
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
              <div className="empty-icon"><FiCreditCard size={48} /></div>
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
                      <td>
                        {payment.payment_method === 'VNPAY' ? (
                          <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                            <FiCreditCard size={16} />
                            <strong>VNPay</strong>
                          </span>
                        ) : payment.payment_method === 'VIRTUAL' ? (
                          <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                            <FiZap size={16} />
                            <span>Nạp tiền ảo</span>
                          </span>
                        ) : (
                          payment.payment_method || 'N/A'
                        )}
                      </td>
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
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '16px'}}>
            <div style={{
              background: '#f8fafc',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{fontSize: '16px', margin: '0 0 8px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <FiZap size={18} /> Nạp tiền ảo
              </h3>
              <p style={{fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.6}}>
                Hệ thống tự động xác nhận và cộng tiền ngay lập tức. Phù hợp để test hoặc nạp tiền nhanh chóng.
              </p>
            </div>
            <div style={{
              background: '#eef2ff',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid #c7d2fe'
            }}>
              <h3 style={{fontSize: '16px', margin: '0 0 8px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <FiCreditCard size={18} /> VNPay
              </h3>
              <p style={{fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.6}}>
                Thanh toán qua VNPay bằng thẻ ATM nội địa, thẻ tín dụng quốc tế (Visa, Mastercard) hoặc ví điện tử. 
                Số tiền tối thiểu: 10,000₫. Sau khi thanh toán thành công, bạn sẽ được tự động chuyển về trang này.
              </p>
            </div>
            <div style={{
              background: '#f0fdf4',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid #bbf7d0'
            }}>
              <h3 style={{fontSize: '16px', margin: '0 0 8px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <FiGift size={18} /> Điểm tích lũy
              </h3>
              <p style={{fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.6}}>
                Mỗi 100₫ nạp tiền = 1 điểm tích lũy. Điểm có thể đổi lại thành tiền (100 điểm = 10₫) ở trang Dashboard.
              </p>
            </div>
          </div>
        </section>
        <Footer />
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
    
    // Xử lý VNPay payment
    if(formData.payment_method === 'VNPAY'){
      // Validate số tiền tối thiểu cho VNPay (thường là 10,000 VND)
      if(formData.amount_cents < 10000){
        setError('Số tiền tối thiểu cho thanh toán VNPay là 10,000₫')
        return
      }
      
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_URL}/payments/vnpay/create`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount_cents: formData.amount_cents,
            description: formData.description || `Nạp tiền ${formatCurrency(formData.amount_cents)}`,
            bank_code: '' // Có thể thêm bank_code sau
          })
        })
        const data = await res.json()
        if(res.ok && data.payment_url){
          // Redirect đến VNPay payment URL (không cần alert vì sẽ redirect ngay)
          window.location.href = data.payment_url
        } else {
          setError(data.detail || 'Tạo thanh toán VNPay thất bại. Vui lòng thử lại.')
          setLoading(false)
        }
      } catch(err) {
        setError(`Lỗi kết nối: ${err.message || String(err)}. Vui lòng kiểm tra kết nối mạng và thử lại.`)
        setLoading(false)
      }
      return
    }
    
    // Xử lý các payment method khác (VIRTUAL, BANK_TRANSFER, etc.)
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
        const pointsMsg = data.points_earned ? `\nNhận được ${data.points_earned.toLocaleString('vi-VN')} điểm tích lũy!` : ''
        // Success message sẽ được hiển thị qua parent component
        onSuccess(`Nạp tiền thành công! Số dư đã được cập nhật.${pointsMsg}`)
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
          <button className="btn-icon" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiX size={20} /></button>
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
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '8px'}}>
              <PaymentMethodCard
                value="VIRTUAL"
                selected={formData.payment_method === 'VIRTUAL'}
                onClick={() => setFormData({...formData, payment_method: 'VIRTUAL'})}
                icon={<FiZap size={32} />}
                title="Nạp tiền ảo"
                description="Tự động xác nhận ngay"
                color="#10b981"
              />
              <PaymentMethodCard
                value="VNPAY"
                selected={formData.payment_method === 'VNPAY'}
                onClick={() => setFormData({...formData, payment_method: 'VNPAY'})}
                icon={<FiCreditCard size={32} />}
                title="VNPay"
                description="ATM, Thẻ tín dụng, Ví điện tử"
                color="#667eea"
              />
            </div>
            {formData.payment_method === 'VIRTUAL' && (
              <div className="alert alert-info" style={{marginTop: '12px', fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
                <FiZap size={16} style={{ marginTop: '2px', flexShrink: 0 }} /> 
                <div><strong>Nạp tiền ảo:</strong> Hệ thống sẽ tự động xác nhận và cập nhật số dư ngay lập tức. 
                Phù hợp để test hoặc nạp tiền nhanh.</div>
              </div>
            )}
            {formData.payment_method === 'VNPAY' && (
              <div className="alert alert-info" style={{marginTop: '12px', fontSize: '13px', background: '#eef2ff', borderColor: '#667eea'}}>
                <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px'}}>
                  <FiCreditCard size={16} style={{ marginTop: '2px', flexShrink: 0 }} /> 
                  <div><strong>VNPay:</strong> Bạn sẽ được chuyển đến trang thanh toán VNPay để hoàn tất giao dịch. 
                  Hỗ trợ thẻ ATM nội địa, thẻ tín dụng quốc tế (Visa, Mastercard), và các ví điện tử phổ biến.</div>
                </div>
                <small style={{display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', opacity: 0.8}}>
                  <FiClock size={14} /> Sau khi thanh toán thành công, bạn sẽ được tự động chuyển về trang này và số dư sẽ được cập nhật.
                </small>
              </div>
            )}
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
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                formData.payment_method === 'VNPAY' ? (
                  <>
                    <FiRefreshCw size={18} style={{marginRight: '8px', animation: 'spin 1s linear infinite'}} />
                    Đang tạo thanh toán VNPay...
                  </>
                ) : (
                  'Đang tạo...'
                )
              ) : (
                formData.payment_method === 'VNPAY' ? (
                  <>
                    <FiCreditCard size={18} style={{marginRight: '8px'}} />
                    Thanh toán qua VNPay
                  </>
                ) : (
                  'Tạo thanh toán'
                )
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PaymentMethodCard({ value, selected, onClick, icon, title, description, color }){
  return (
    <div
      onClick={onClick}
      style={{
        border: `2px solid ${selected ? color : '#e2e8f0'}`,
        borderRadius: '8px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        background: selected ? `${color}10` : 'white',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        if(!selected) e.currentTarget.style.borderColor = color
      }}
      onMouseLeave={(e) => {
        if(!selected) e.currentTarget.style.borderColor = '#e2e8f0'
      }}
    >
      {selected && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          ✓
        </div>
      )}
      <div style={{fontSize: '32px', marginBottom: '8px'}}>{icon}</div>
      <div style={{fontWeight: '600', marginBottom: '4px', color: selected ? color : '#1e293b'}}>
        {title}
      </div>
      <div style={{fontSize: '12px', color: '#64748b'}}>{description}</div>
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
            <FiDatabase size={24} color="white" />
          </div>
          <h2 style={{margin: 0, fontSize: '24px', fontWeight: '700', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>CloudDB</h2>
        </div>
      </div>
      <nav className="sidebar-nav">
        <Link to="/app" className="nav-item">
          <span className="nav-icon"><FiHome size={20} /></span>
          <span>Trang chủ</span>
        </Link>
        <Link to="/app/databases" className="nav-item">
          <span className="nav-icon"><FiDatabase size={20} /></span>
          <span>Quản lý Database</span>
        </Link>
        <Link to="/app/subscriptions" className="nav-item">
          <span className="nav-icon"><FiPackage size={20} /></span>
          <span>Gói dịch vụ</span>
        </Link>
        <Link to="/app/payments" className="nav-item active">
          <span className="nav-icon"><FiCreditCard size={20} /></span>
          <span>Thanh toán</span>
        </Link>
        <Link to="/app/usage" className="nav-item">
          <span className="nav-icon"><FiBarChart2 size={20} /></span>
          <span>Thống kê</span>
        </Link>
        <Link to="/app/profile" className="nav-item">
          <span className="nav-icon"><FiUser size={20} /></span>
          <span>Tài khoản</span>
        </Link>
      </nav>
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={() => { clearToken(); window.location.href = '/login' }}>
          <span className="nav-icon"><FiLogOut size={20} /></span>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  )
}

