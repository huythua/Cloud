import React, { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { API_URL } from '../config'
import { Link, useSearchParams } from 'react-router-dom'

export default function Databases(){
  const { token } = useAuth()
  const [dbs, setDbs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchParams] = useSearchParams()
  const [testMode, setTestMode] = useState(() => {
    // Load từ localStorage
    return localStorage.getItem('db_test_mode') === 'true'
  })
  const [storageInfo, setStorageInfo] = useState(null)
  const [loadingStorage, setLoadingStorage] = useState(false)

  useEffect(() => {
    if(!token) return
    if(searchParams.get('action') === 'create') setShowCreateForm(true)
    fetchDbs()
    fetchStorageSummary()
  }, [token, searchParams])

  async function fetchDbs(){
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/db/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if(!res.ok){
        const j = await res.json().catch(() => ({detail: 'Lỗi'}))
        setError(j.detail || 'Lỗi khi tải dữ liệu')
        setLoading(false)
        return
      }
      const data = await res.json()
      setDbs(data)
      setLoading(false)
    } catch(err) {
      setError(String(err))
      setLoading(false)
    }
  }

  async function fetchStorageSummary(){
    setLoadingStorage(true)
    try {
      const url = new URL(`${API_URL}/subscription/storage-info`)
      if (testMode) {
        url.searchParams.set('test_mode', 'true')
      }
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if(res.ok){
        const data = await res.json()
        setStorageInfo(data)
      }
    } catch(err) {
      console.error('Failed to fetch storage summary:', err)
    } finally {
      setLoadingStorage(false)
    }
  }

  async function handleDelete(dbId){
    if(!confirm('Bạn có chắc muốn xóa database này?')) return
    try {
      const res = await fetch(`${API_URL}/db/${dbId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if(res.ok){
        fetchDbs()
      } else {
        alert('Xóa thất bại')
      }
    } catch(err) {
      alert('Lỗi: ' + err)
    }
  }

  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')

  const filteredDbs = dbs.filter(db => {
    const matchName = db.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = filterStatus === 'ALL' ? true : db.status === filterStatus
    return matchName && matchStatus
  })

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <div className="page-header">
          <div>
            <h1>Quản lý Database</h1>
            <p className="page-subtitle">Tạo và quản lý các database cloud của bạn</p>
          </div>
          <div style={{display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end'}}>
            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
              <input
                type="text"
                placeholder="Tìm theo tên..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '999px', border: '1px solid #e5e7eb', fontSize: '13px', minWidth: '180px' }}
              />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '999px', border: '1px solid #e5e7eb', fontSize: '13px' }}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PENDING">PENDING</option>
                <option value="FAILED">FAILED</option>
                <option value="BLOCKED">BLOCKED</option>
                <option value="DELETED">DELETED</option>
              </select>
            </div>
            <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px'}}>
              <input 
                type="checkbox" 
                checked={testMode}
                onChange={(e) => {
                  const enabled = e.target.checked
                  setTestMode(enabled)
                  localStorage.setItem('db_test_mode', enabled.toString())
                  // Reload stats để áp dụng test mode
                  fetchDbs()
                }}
                style={{width: '18px', height: '18px', cursor: 'pointer'}}
              />
              <span style={{color: testMode ? '#f59e0b' : '#64748b', fontWeight: testMode ? 'bold' : 'normal'}}>
                🧪 Chế độ Test (Random data)
              </span>
            </label>
            <button className="btn-primary" onClick={() => setShowCreateForm(true)}>
              ➕ Tạo Database mới
            </button>
          </div>
        </div>

        {showCreateForm && (
          <CreateDatabaseForm 
            onClose={() => setShowCreateForm(false)} 
            onSuccess={() => { setShowCreateForm(false); fetchDbs(); }}
            token={token}
          />
        )}

        {/* Tổng quan dung lượng theo gói dịch vụ */}
        {loadingStorage && (
          <div className="loading">Đang tải thông tin dung lượng...</div>
        )}
        {!loadingStorage && storageInfo && storageInfo.has_subscription && storageInfo.storage && (
          <div style={{marginBottom: '16px', padding: '14px 16px', borderRadius: '10px', background: '#0f172a', color: '#e5e7eb', boxShadow: '0 18px 45px rgba(15,23,42,0.45)', border: '1px solid rgba(148,163,184,0.3)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
              <div style={{fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af'}}>
                Tổng dung lượng đã dùng / Giới hạn gói
              </div>
              <div style={{fontSize: '13px', color: '#e5e7eb'}}>
                {storageInfo.storage.used_mb} MB / {storageInfo.storage.plan_limit_mb} MB
              </div>
            </div>
            <div style={{height: '8px', borderRadius: '999px', background: 'rgba(15,23,42,0.9)', overflow: 'hidden', border: '1px solid rgba(55,65,81,0.9)'}}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, storageInfo.storage.used_percent || 0)}%`,
                  borderRadius: '999px',
                  background: storageInfo.storage.quota_status === 'BLOCKED'
                    ? 'linear-gradient(90deg,#ef4444,#b91c1c)'
                    : storageInfo.storage.quota_status === 'WARNING'
                    ? 'linear-gradient(90deg,#f59e0b,#d97706)'
                    : 'linear-gradient(90deg,#22c55e,#16a34a)',
                  boxShadow: '0 0 18px rgba(34,197,94,0.5)'
                }}
              />
            </div>
            <div style={{marginTop: '6px', fontSize: '12px', color: '#9ca3af', display: 'flex', justifyContent: 'space-between'}}>
              <span>
                Đã dùng khoảng {Math.round(storageInfo.storage.used_percent || 0)}% dung lượng gói.
              </span>
              {storageInfo.storage.quota_status === 'WARNING' && (
                <span style={{color: '#fbbf24'}}>⚠️ Gần chạm giới hạn, cân nhắc nâng cấp gói.</span>
              )}
              {storageInfo.storage.quota_status === 'BLOCKED' && (
                <span style={{color: '#fca5a5'}}>🚫 Đã vượt giới hạn, một số kết nối có thể bị khóa.</span>
              )}
            </div>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}
        {loading && <div className="loading">Đang tải...</div>}

        {!loading && !error && (
          <div className="databases-grid">
            {dbs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🗄️</div>
                <h3>Chưa có database nào</h3>
                <p>Bắt đầu bằng cách tạo database đầu tiên của bạn</p>
                <p style={{fontSize: '13px', color: '#64748b', marginTop: '8px'}}>
                  ⚠️ Lưu ý: Bạn cần đăng ký gói dịch vụ trước khi tạo database
                </p>
                <div style={{display: 'flex', gap: '12px', marginTop: '16px'}}>
                  <button className="btn-primary" onClick={() => setShowCreateForm(true)}>
                    Tạo Database
                  </button>
                  <Link to="/app/subscriptions" className="btn-secondary">
                    Đăng ký gói
                  </Link>
                </div>
              </div>
            ) : (
              dbs.map(db => (
                <DatabaseCard 
                  key={db.id} 
                  db={db} 
                  onDelete={handleDelete}
                  token={token}
                  testMode={testMode}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DatabaseCard({ db, onDelete, token, testMode = false }){
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [showConnectionInfo, setShowConnectionInfo] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)

  async function loadStats(){
    setLoadingStats(true)
    try {
      const url = new URL(`${API_URL}/db/${db.id}/stats`)
      if(testMode) {
        url.searchParams.set('test_mode', 'true')
      }
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if(res.ok){
        const data = await res.json()
        setStats(data)
      }
    } catch(err) {
      console.error('Failed to load stats:', err)
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    if(db.status === 'ACTIVE' || db.status === 'BLOCKED') loadStats()
  }, [db.id, testMode])

  const statusColors = {
    ACTIVE: '#10b981',
    PENDING: '#f59e0b',
    FAILED: '#ef4444',
    DELETED: '#6b7280',
    BLOCKED: '#ef4444'
  }
  
  const quotaStatusColors = {
    NORMAL: '#10b981',
    WARNING: '#f59e0b',
    BLOCKED: '#ef4444'
  }

  return (
    <>
      <div className="database-card">
        <div className="database-header">
          <div>
            <h3>{db.name}</h3>
            <div style={{display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
              <span className="database-status" style={{ backgroundColor: statusColors[db.status] + '20', color: statusColors[db.status] }}>
                {db.status}
              </span>
              {stats?.quota_status && stats.quota_status !== 'NORMAL' && (
                <span className="database-status" style={{ 
                  backgroundColor: quotaStatusColors[stats.quota_status] + '20', 
                  color: quotaStatusColors[stats.quota_status],
                  fontSize: '11px'
                }}>
                  {stats.quota_status === 'WARNING' ? '⚠️ CẢNH BÁO' : '🚫 BỊ KHÓA'}
                </span>
              )}
            </div>
          </div>
          <div className="database-actions">
            <button className="btn-icon" onClick={loadStats} title="Làm mới">
              🔄
            </button>
            {db.status === 'ACTIVE' && (
              <>
                <button className="btn-icon" onClick={() => setShowConnectionInfo(true)} title="Thông tin kết nối">
                  🔌
                </button>
                <button className="btn-icon" onClick={() => setShowResetPassword(true)} title="Đổi mật khẩu">
                  🔑
                </button>
              </>
            )}
            <button className="btn-icon btn-danger" onClick={() => onDelete(db.id)} title="Xóa">
              🗑️
            </button>
          </div>
        </div>
        
        <div className="database-info">
          {db.quota_mb && (
            <div className="info-item">
              <span className="info-label">Quota ước tính:</span>
              <span className="info-value">{db.quota_mb} MB</span>
            </div>
          )}
          {db.hostname && (
            <div className="info-item">
              <span className="info-label">Host:</span>
              <span className="info-value">{db.hostname}:{db.port || 3306}</span>
            </div>
          )}
          {stats && (
            <div className="info-item">
              <span className="info-label">Đã dùng:</span>
              <span className="info-value">{stats.used_mb?.toFixed(2) || 0} MB</span>
            </div>
          )}
        </div>

        {stats && stats.quota_status === 'BLOCKED' && (
          <div className="alert alert-error" style={{marginTop: '12px', padding: '12px', fontSize: '13px'}}>
            <strong>🚫 Database bị khóa!</strong><br/>
            Dung lượng lưu trữ đã đạt/quá giới hạn của gói dịch vụ. Vui lòng nâng cấp gói hoặc xóa bớt dữ liệu để tiếp tục sử dụng.
          </div>
        )}

        {stats && stats.quota_status === 'WARNING' && (
          <div className="alert alert-warning" style={{marginTop: '12px', padding: '12px', fontSize: '13px'}}>
            <strong>⚠️ Cảnh báo!</strong><br/>
            Dung lượng lưu trữ đang gần đạt giới hạn. Hãy xem xét nâng cấp gói dịch vụ hoặc xóa bớt dữ liệu.
          </div>
        )}

        {stats && stats.quota_mb && (
          <div className="database-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${Math.min(100, ((stats.used_mb || 0) / stats.quota_mb) * 100)}%`,
                  backgroundColor: stats.quota_status === 'BLOCKED' ? '#ef4444' : 
                                   stats.quota_status === 'WARNING' ? '#f59e0b' : '#3b82f6'
                }}
              />
            </div>
            <div className="progress-text">
              {Math.round(((stats.used_mb || 0) / stats.quota_mb) * 100)}% đã sử dụng (ước tính)
            </div>
          </div>
        )}
      </div>

      {showConnectionInfo && (
        <ConnectionInfoModal 
          dbId={db.id} 
          token={token}
          onClose={() => setShowConnectionInfo(false)} 
        />
      )}

      {showResetPassword && (
        <ResetPasswordModal 
          dbId={db.id} 
          token={token}
          onClose={() => setShowResetPassword(false)}
          onSuccess={() => { setShowResetPassword(false); alert('Đổi mật khẩu thành công!') }}
        />
      )}
    </>
  )
}

function CreateDatabaseForm({ onClose, onSuccess, token }){
  const [formData, setFormData] = useState({
    name: '',
    db_user: '',
    db_password: '',
    quota_mb: null  // Optional - chỉ để hiển thị ước tính
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [storageInfo, setStorageInfo] = useState(null)
  const [loadingInfo, setLoadingInfo] = useState(true)

  useEffect(() => {
    async function fetchStorageInfo(){
      try {
        const res = await fetch(`${API_URL}/subscription/storage-info`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if(res.ok){
          const data = await res.json()
          setStorageInfo(data)
          // Không set quota mặc định nữa vì quota là optional
        }
      } catch(err) {
        console.error('Failed to fetch storage info:', err)
      } finally {
        setLoadingInfo(false)
      }
    }
    fetchStorageInfo()
  }, [token])

  async function handleSubmit(e){
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/db/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          db_user: formData.db_user,
          db_password: formData.db_password,
          ...(formData.quota_mb && { quota_mb: formData.quota_mb })
        })
      })
      const data = await res.json()
      if(res.ok){
        onSuccess()
      } else {
        const errorMsg = data.detail || 'Tạo database thất bại'
        if(errorMsg.includes('active subscription')){
          setError(`❌ ${errorMsg}\n\nVui lòng đăng ký gói dịch vụ trước khi tạo database.`)
        } else if(errorMsg.includes('Quota exceeds')){
          setError(`❌ ${errorMsg}`)
        } else {
          setError(errorMsg)
        }
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
          <h2>Tạo Database mới</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          {error && <div className="alert alert-error">{error}</div>}
          
          {/* Hiển thị thông tin gói dịch vụ */}
          {loadingInfo ? (
            <div className="loading">Đang tải thông tin gói dịch vụ...</div>
          ) : storageInfo && !storageInfo.has_subscription ? (
            <div className="alert alert-error">
              <strong>⚠️ Chưa có gói dịch vụ:</strong> {storageInfo.message}
              <div style={{marginTop: '12px'}}>
                <Link to="/app/subscriptions" className="btn-primary" style={{textDecoration: 'none', display: 'inline-block'}}>
                  Đăng ký gói ngay
                </Link>
              </div>
            </div>
          ) : storageInfo && storageInfo.has_subscription ? (
            <div className="alert alert-info" style={{background: '#eff6ff', border: '1px solid #3b82f6', padding: '16px', borderRadius: '8px', marginBottom: '20px'}}>
              <h3 style={{margin: '0 0 12px 0', fontSize: '16px', color: '#1e40af'}}>📦 Thông tin gói dịch vụ</h3>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px'}}>
                <div>
                  <strong>Gói đang dùng:</strong> {storageInfo.subscription.plan_name}
                </div>
                <div>
                  <strong>Hạn sử dụng:</strong> {storageInfo.subscription.expires_at ? new Date(storageInfo.subscription.expires_at).toLocaleDateString('vi-VN') : 'N/A'}
                </div>
              </div>
              <div style={{marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '6px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px'}}>
                  <span><strong>Dung lượng đã dùng:</strong> {storageInfo.storage.used_mb} MB / {storageInfo.storage.plan_limit_mb} MB</span>
                  <span style={{color: storageInfo.storage.used_percent > 80 ? '#ef4444' : '#10b981', fontWeight: 'bold'}}>
                    {storageInfo.storage.used_percent}%
                  </span>
                </div>
                <div style={{height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden'}}>
                  <div 
                    style={{
                      height: '100%', 
                      width: `${storageInfo.storage.used_percent}%`, 
                      background: storageInfo.storage.used_percent > 80 ? '#ef4444' : storageInfo.storage.used_percent > 60 ? '#f59e0b' : '#10b981',
                      transition: 'width 0.3s'
                    }}
                  />
                </div>
                <div style={{marginTop: '8px', fontSize: '13px', color: '#64748b'}}>
                  <strong>Còn trống:</strong> {storageInfo.storage.available_mb} MB
                  {storageInfo.storage.available_mb === 0 && (
                    <span style={{color: '#ef4444', marginLeft: '8px'}}>⚠️ Đã hết dung lượng!</span>
                  )}
                </div>
              </div>
            </div>
          ) : null}
          
          <div className="form-group">
            <label>Tên Database</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
              placeholder="my_database"
            />
          </div>
          <div className="form-group">
            <label>Database User</label>
            <input 
              type="text" 
              value={formData.db_user}
              onChange={e => setFormData({...formData, db_user: e.target.value})}
              required
              placeholder="db_user"
            />
          </div>
          <div className="form-group">
            <label>Database Password</label>
            <input 
              type="password" 
              value={formData.db_password}
              onChange={e => setFormData({...formData, db_password: e.target.value})}
              required
              placeholder="••••••••"
            />
          </div>
          <div className="form-group">
            <label>Quota ước tính (MB) - Tùy chọn</label>
            <input 
              type="number" 
              value={formData.quota_mb || ''}
              onChange={e => {
                const value = e.target.value ? parseInt(e.target.value) : null
                if(value !== null){
                  const maxQuota = storageInfo?.has_subscription ? storageInfo.storage.available_mb : 999999
                  setFormData({...formData, quota_mb: Math.min(value, maxQuota)})
                } else {
                  setFormData({...formData, quota_mb: null})
                }
              }}
              min="1"
              max={storageInfo?.has_subscription ? storageInfo.storage.available_mb : undefined}
              placeholder="Để trống nếu không cần"
            />
            <p className="hint" style={{marginTop: '4px', fontSize: '12px', color: '#64748b'}}>
              ⓘ Quota này chỉ để hiển thị ước tính. Database không bị giới hạn dung lượng riêng lẻ.
              <br/>
              Giới hạn thực tế dựa trên tổng dung lượng của gói dịch vụ ({storageInfo?.has_subscription ? storageInfo.storage.plan_limit_mb : 'N/A'} MB).
            </p>
            {storageInfo?.has_subscription && (
              <p className="hint" style={{marginTop: '4px', fontSize: '12px', color: '#64748b'}}>
                Dung lượng đã dùng: {storageInfo.storage.used_mb} MB / {storageInfo.storage.plan_limit_mb} MB ({storageInfo.storage.used_percent}%)
              </p>
            )}
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo Database'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConnectionInfoModal({ dbId, token, onClose }){
  const [connectionInfo, setConnectionInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchConnectionInfo(){
      try {
        const res = await fetch(`${API_URL}/db/${dbId}/connection`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if(res.ok){
          const data = await res.json()
          setConnectionInfo(data)
        } else {
          const data = await res.json().catch(() => ({}))
          setError(data.detail || 'Không thể lấy thông tin kết nối')
        }
      } catch(err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }
    fetchConnectionInfo()
  }, [dbId, token])

  function copyToClipboard(text){
    navigator.clipboard.writeText(text)
    alert('Đã sao chép!')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Thông tin kết nối Database</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {loading && <div className="loading">Đang tải...</div>}
          {error && <div className="alert alert-error">{error}</div>}
          {connectionInfo && (
            <div className="connection-info">
              <div className="info-group">
                <label>Hostname</label>
                <div className="info-value-with-copy">
                  <code>{connectionInfo.hostname}</code>
                  <button className="btn-copy" onClick={() => copyToClipboard(connectionInfo.hostname)}>📋</button>
                </div>
              </div>
              <div className="info-group">
                <label>Port</label>
                <div className="info-value-with-copy">
                  <code>{connectionInfo.port}</code>
                  <button className="btn-copy" onClick={() => copyToClipboard(String(connectionInfo.port))}>📋</button>
                </div>
              </div>
              <div className="info-group">
                <label>Database Name</label>
                <div className="info-value-with-copy">
                  <code>{connectionInfo.database_name}</code>
                  <button className="btn-copy" onClick={() => copyToClipboard(connectionInfo.database_name)}>📋</button>
                </div>
              </div>
              <div className="info-group">
                <label>Username</label>
                <div className="info-value-with-copy">
                  <code>{connectionInfo.username}</code>
                  <button className="btn-copy" onClick={() => copyToClipboard(connectionInfo.username)}>📋</button>
                </div>
              </div>
              <div className="info-group">
                <label>Password</label>
                <div className="info-value-with-copy">
                  <code>{connectionInfo.password}</code>
                  <button className="btn-copy" onClick={() => copyToClipboard(connectionInfo.password)}>📋</button>
                </div>
              </div>
              <div className="info-group">
                <label>Connection String</label>
                <div className="info-value-with-copy">
                  <code className="connection-string">{connectionInfo.connection_string}</code>
                  <button className="btn-copy" onClick={() => copyToClipboard(connectionInfo.connection_string)}>📋</button>
                </div>
              </div>
              
              {connectionInfo.jdbc_url && (
                <>
                  <div className="info-group">
                    <label>JDBC URL (cho DBeaver, MySQL Workbench, etc.)</label>
                    <div className="info-value-with-copy">
                      <code className="connection-string">{connectionInfo.jdbc_url}</code>
                      <button className="btn-copy" onClick={() => copyToClipboard(connectionInfo.jdbc_url)}>📋</button>
                    </div>
                
                  </div>
                  
                  <div className="alert alert-info" style={{marginTop: '16px', padding: '12px'}}>
                    <strong>📖 Hướng dẫn kết nối DBeaver:</strong>
                    <ol style={{marginTop: '8px', paddingLeft: '20px', fontSize: '13px'}}>
                      <li>Tạo connection mới: Database → New Database Connection → MySQL</li>
                      <li>Nhập thông tin:
                        <ul style={{marginTop: '4px', paddingLeft: '20px'}}>
                          <li>Host: <code>{connectionInfo.hostname}</code></li>
                          <li>Port: <code>{connectionInfo.port}</code></li>
                          <li>Database: <code>{connectionInfo.database_name}</code></li>
                          <li>Username: <code>{connectionInfo.username}</code></li>
                          <li>Password: <code>{connectionInfo.password}</code></li>
                        </ul>
                      </li>
                      <li>Tab "Driver properties" → Thêm property:
                        <ul style={{marginTop: '4px', paddingLeft: '20px'}}>
                          <li>Property: <code>allowPublicKeyRetrieval</code></li>
                          <li>Value: <code>true</code></li>
                        </ul>
                      </li>
                      <li>Hoặc dán JDBC URL trực tiếp vào tab "Main" → "JDBC URL"</li>
                    </ol>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  )
}

function ResetPasswordModal({ dbId, token, onClose, onSuccess }){
  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e){
    e.preventDefault()
    if(formData.new_password !== formData.confirm_password){
      setError('Mật khẩu mới không khớp')
      return
    }
    if(formData.new_password.length < 6){
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/db/${dbId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ new_password: formData.new_password })
      })
      const data = await res.json()
      if(res.ok){
        onSuccess()
      } else {
        setError(data.detail || 'Đổi mật khẩu thất bại')
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
          <h2>Đổi mật khẩu Database</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>Mật khẩu mới</label>
            <input 
              type="password" 
              value={formData.new_password}
              onChange={e => setFormData({...formData, new_password: e.target.value})}
              required
              minLength="6"
              placeholder="••••••••"
            />
          </div>
          <div className="form-group">
            <label>Xác nhận mật khẩu mới</label>
            <input 
              type="password" 
              value={formData.confirm_password}
              onChange={e => setFormData({...formData, confirm_password: e.target.value})}
              required
              minLength="6"
              placeholder="••••••••"
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </button>
          </div>
        </form>
      </div>
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
        <Link to="/app/databases" className="nav-item active">
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

