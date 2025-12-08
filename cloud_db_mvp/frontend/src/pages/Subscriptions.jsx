import React, { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { API_URL } from '../config'
import { Link } from 'react-router-dom'

export default function Subscriptions(){
  const { token, user, refreshUser } = useAuth()
  const [plans, setPlans] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [activeSub, setActiveSub] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if(!token) return
    fetchPlans()
    fetchSubscriptions()
  }, [token])

  async function fetchPlans(){
    try {
      const res = await fetch(`${API_URL}/plans`)
      if(res.ok){
        const data = await res.json()
        setPlans(data)
      }
    } catch(err) {
      console.error('Failed to fetch plans:', err)
    }
  }

  async function fetchSubscriptions(){
    setLoading(true)
    setError(null)
    try {
      const listRes = await fetch(`${API_URL}/subscriptions`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      })
      
      if(listRes.ok){
        const data = await listRes.json()
        setSubscriptions(data)
      } else {
        const errorData = await listRes.json().catch(() => ({detail: 'Lỗi khi tải subscriptions'}))
        setError(errorData.detail || 'Lỗi khi tải subscriptions')
      }
      
      // Fetch active subscription (có thể không có nên catch 404)
      try {
        const activeRes = await fetch(`${API_URL}/subscriptions/active`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        })
        if(activeRes.ok){
          const data = await activeRes.json()
          setActiveSub(data)
        } else if(activeRes.status === 404){
          // Không có active subscription - đây là bình thường
          setActiveSub(null)
        }
      } catch(err) {
        // Ignore error khi không có active subscription
        setActiveSub(null)
      }
    } catch(err) {
      setError(String(err))
      console.error('Failed to fetch subscriptions:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubscribe(planId, autoRenew = true){
    // Tìm plan để hiển thị thông tin
    const plan = plans.find(p => p.id === planId)
    const planName = plan?.name || 'gói dịch vụ'
    const planPrice = plan?.price_monthly_cents || 0
    
    // Confirm dialog với cảnh báo
    const confirmMsg = `⚠️ XÁC NHẬN ĐĂNG KÝ GÓI DỊCH VỤ\n\n` +
      `Gói: ${planName}\n` +
      `Giá: ${planPrice > 0 ? `${(planPrice / 100).toLocaleString('vi-VN')}₫/tháng` : 'Miễn phí'}\n\n` +
      `⚠️ CẢNH BÁO:\n` +
      `• Số dư tài khoản sẽ bị trừ ${planPrice > 0 ? `${(planPrice / 100).toLocaleString('vi-VN')}₫` : '0₫'} ngay lập tức\n` +
      `• Nếu hủy đăng ký sau này, bạn sẽ KHÔNG được hoàn tiền\n` +
      `• Auto-renew: ${autoRenew ? 'BẬT' : 'TẮT'} (tự động gia hạn mỗi tháng)\n\n` +
      `Bạn có chắc chắn muốn đăng ký?`
    
    if(!confirm(confirmMsg)) {
      return
    }
    
    console.log('handleSubscribe called:', { planId, autoRenew, token: token ? 'exists' : 'missing' })
    try {
      const res = await fetch(`${API_URL}/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan_id: planId, auto_renew: autoRenew })
      })
      const data = await res.json()
      if(res.ok){
        alert('✅ Đăng ký thành công! Số dư đã được trừ.')
        fetchSubscriptions()
        // Refresh user để cập nhật số dư - đợi một chút để đảm bảo backend đã commit
        if(refreshUser) {
          setTimeout(() => {
            refreshUser()
          }, 500)
        }
      } else {
        const errorMsg = data.detail || 'Đăng ký thất bại'
        if(errorMsg.includes('Insufficient balance')){
          alert(`❌ ${errorMsg}\n\nVui lòng nạp tiền trước khi đăng ký gói.`)
        } else {
          alert(`❌ ${errorMsg}`)
        }
      }
    } catch(err) {
      alert('Lỗi: ' + err)
    }
  }

  async function handleCancel(subId){
    const sub = subscriptions.find(s => s.id === subId)
    const confirmMsg = `⚠️ XÁC NHẬN HỦY ĐĂNG KÝ\n\n` +
      `Bạn có chắc chắn muốn hủy subscription này?\n\n` +
      `⚠️ CẢNH BÁO QUAN TRỌNG:\n` +
      `• Bạn sẽ KHÔNG được hoàn tiền đã thanh toán\n` +
      `• Tất cả databases của bạn có thể bị ảnh hưởng\n` +
      `• Bạn sẽ không thể tạo database mới cho đến khi đăng ký lại gói dịch vụ\n\n` +
      `Bạn vẫn muốn tiếp tục hủy?`
    
    if(!confirm(confirmMsg)) return
    
    try {
      const res = await fetch(`${API_URL}/subscriptions/${subId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if(res.ok){
        alert('✅ Đã hủy subscription thành công')
        fetchSubscriptions()
      } else {
        alert('❌ Hủy thất bại: ' + (data.detail || 'Unknown error'))
      }
    } catch(err) {
      alert('Lỗi: ' + err)
    }
  }

  async function handleToggleAutoRenew(subId, currentValue){
    try {
      const res = await fetch(`${API_URL}/subscriptions/${subId}/auto-renew`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if(res.ok){
        fetchSubscriptions()
      } else {
        alert('❌ Thay đổi auto-renew thất bại: ' + (data.detail || 'Unknown error'))
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
            <h1>Gói dịch vụ</h1>
            <p className="page-subtitle">Chọn và đăng ký gói database phù hợp với nhu cầu của bạn</p>
            <p style={{fontSize: '13px', color: '#64748b', marginTop: '6px'}}>
              Các gói sẽ giới hạn tổng dung lượng storage cho toàn bộ database của bạn. Khi gần đạt 80% sẽ có cảnh báo, đạt 100% hệ thống sẽ tạm khóa kết nối.
            </p>
          </div>
        </div>

        {activeSub && (
          <div className="alert alert-info">
            <strong>✅ Gói đang dùng:</strong> Bạn đang sử dụng gói subscription ID {activeSub.id}
            {activeSub.expires_at && (
              <span> - Hết hạn: {new Date(activeSub.expires_at).toLocaleDateString('vi-VN')}</span>
            )}
          </div>
        )}
        
        {!activeSub && (
          <div className="alert alert-warning" style={{background: '#fef3c7', color: '#d97706', border: '1px solid #fcd34d'}}>
            <strong>⚠️ Chưa có gói dịch vụ:</strong> Bạn cần đăng ký gói dịch vụ và có đủ số dư để tạo database.
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}
        {loading && <div className="loading">Đang tải...</div>}

        <section className="plans-section">
          <h2>Bảng giá</h2>
          {!loading && plans.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>Chưa có gói dịch vụ nào</h3>
            </div>
          )}
          {!loading && plans.length > 0 && (
            <div className="plans-grid">
            {plans.map(plan => (
              <PlanCard 
                key={plan.id} 
                plan={plan} 
                onSubscribe={handleSubscribe}
                isActive={activeSub?.plan_id === plan.id}
                userBalance={user?.balance_cents}
              />
            ))}
            </div>
          )}
        </section>

        <section className="subscriptions-section">
          <h2>Lịch sử đăng ký</h2>
          {loading && <div className="loading">Đang tải...</div>}
          {!loading && subscriptions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>Chưa có subscription nào</h3>
              <p>Đăng ký gói dịch vụ để bắt đầu sử dụng</p>
            </div>
          ) : (
            <div className="subscriptions-list">
              {subscriptions.map(sub => (
                <div key={sub.id} className="subscription-card">
                  <div className="subscription-info">
                    <h3>Subscription #{sub.id}</h3>
                    <div className="subscription-details">
                      <span className="badge" style={{ backgroundColor: sub.status === 'ACTIVE' ? '#10b981' : '#6b7280' }}>
                        {sub.status}
                      </span>
                      <span>Plan ID: {sub.plan_id}</span>
                      {sub.started_at && <span>Bắt đầu: {new Date(sub.started_at).toLocaleDateString('vi-VN')}</span>}
                      {sub.expires_at && <span>Hết hạn: {new Date(sub.expires_at).toLocaleDateString('vi-VN')}</span>}
                    </div>
                  </div>
                  {sub.status === 'ACTIVE' && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={sub.auto_renew === 1}
                          onChange={() => handleToggleAutoRenew(sub.id, sub.auto_renew)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '14px', color: '#64748b' }}>Auto gia hạn</span>
                      </label>
                      <button className="btn-danger" onClick={() => handleCancel(sub.id)}>
                        Hủy
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="help-section" style={{marginTop: '32px'}}>
          <h2>Hướng dẫn nhanh</h2>
          <ul style={{fontSize: '13px', color: '#64748b', paddingLeft: '18px', marginTop: '8px', lineHeight: 1.6}}>
            <li><strong>1.</strong> Nạp tiền ở mục <strong>Thanh toán</strong> trước, số dư sẽ dùng để trừ khi đăng ký gói.</li>
            <li><strong>2.</strong> Mỗi tài khoản chỉ nên có <strong>1 gói Active</strong> – gói đó quyết định tổng dung lượng storage được phép dùng.</li>
            <li><strong>3.</strong> Khi hết hạn mà <strong>Auto gia hạn</strong> bật và số dư đủ, hệ thống sẽ tự trừ tiền để gia hạn thêm 1 tháng.</li>
            <li><strong>4.</strong> Hủy gói sẽ không hoàn tiền đã thanh toán, và có thể ảnh hưởng đến khả năng tạo / dùng database.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

function PlanCard({ plan, onSubscribe, isActive, userBalance }){
  const formatPrice = (cents) => {
    if(!cents || cents === 0) return 'Miễn phí'
    return `₫${Number(cents).toLocaleString('vi-VN')}/tháng`
  }
  
  // Nếu gói miễn phí hoặc chưa có thông tin balance, vẫn cho phép click (backend sẽ check)
  // Chỉ disable khi biết chắc là không đủ tiền
  const canAfford = plan.price_monthly_cents === 0 || userBalance === undefined || userBalance >= plan.price_monthly_cents
  const insufficientBalance = plan.price_monthly_cents > 0 && userBalance !== undefined && userBalance < plan.price_monthly_cents
  
  // Debug log
  if(plan.id === 1) { // Log cho plan đầu tiên để debug
    console.log('PlanCard debug:', { 
      planId: plan.id, 
      price: plan.price_monthly_cents, 
      userBalance, 
      canAfford, 
      insufficientBalance, 
      isActive,
      willBeDisabled: isActive || insufficientBalance
    })
  }

  return (
    <div className={`plan-card ${isActive ? 'plan-active' : ''}`}>
      <div className="plan-header">
        <h3>{plan.name}</h3>
        {isActive && <span className="badge badge-success">Đang dùng</span>}
      </div>
      <div className="plan-price">{formatPrice(plan.price_monthly_cents)}</div>
      <div className="plan-features">
        <div className="feature-item">
          <span className="feature-icon">💾</span>
          <span>{plan.storage_mb >= 1024 ? `${plan.storage_mb / 1024} GB` : `${plan.storage_mb} MB`} lưu trữ</span>
        </div>
        <div className="feature-item">
          <span className="feature-icon">👥</span>
          <span>{plan.users_allowed} user</span>
        </div>
      </div>
      {plan.description && <p className="plan-desc">{plan.description}</p>}
      {insufficientBalance && !isActive && (
        <div className="alert alert-error" style={{marginTop: '12px', padding: '8px 12px', fontSize: '12px'}}>
          ⚠️ Số dư không đủ. Cần: {formatPrice(plan.price_monthly_cents)}
        </div>
      )}
      <button 
        className={`btn-primary ${isActive || insufficientBalance ? 'btn-disabled' : ''}`}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log('Subscribe button clicked:', { 
            planId: plan.id, 
            isActive, 
            insufficientBalance, 
            userBalance, 
            canAfford,
            price: plan.price_monthly_cents,
            disabled: isActive || insufficientBalance
          })
          if(!isActive && !insufficientBalance) {
            onSubscribe(plan.id)
          } else {
            console.warn('Button click ignored:', { isActive, insufficientBalance })
          }
        }}
        disabled={isActive || insufficientBalance}
        style={{ 
          cursor: isActive || insufficientBalance ? 'not-allowed' : 'pointer',
          position: 'relative',
          zIndex: 10,
          pointerEvents: 'auto' // Force pointer events để đảm bảo click được
        }}
        title={insufficientBalance ? 'Số dư không đủ' : isActive ? 'Đang sử dụng gói này' : 'Click để đăng ký'}
      >
        {isActive ? 'Đang sử dụng' : insufficientBalance ? 'Số dư không đủ' : 'Đăng ký ngay'}
      </button>
    </div>
  )
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
        <Link to="/app/subscriptions" className="nav-item active">
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

