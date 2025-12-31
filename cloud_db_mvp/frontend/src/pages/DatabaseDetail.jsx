import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { API_URL } from '../config'
import Footer from '../components/Footer'
import { ErrorMessage, SuccessMessage, InfoMessage } from '../components/ErrorMessage'
import BackupManager from '../components/BackupManager'
import DatabaseMonitoring from '../components/DatabaseMonitoring'
import CloneDatabase from '../components/CloneDatabase'
import ExportImportDatabase from '../components/ExportImportDatabase'
import SQLQueryExecutor from '../components/SQLQueryExecutor'
import ConnectionInfo from '../components/ConnectionInfo'
import ResetPassword from '../components/ResetPassword'
import { FiBarChart2, FiCode, FiHardDrive, FiTrendingUp, FiCopy, FiUpload, FiDatabase, FiArrowLeft, FiUser, FiLogOut } from 'react-icons/fi'

export default function DatabaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const auth = useAuth()
  const token = auth?.token

  const [database, setDatabase] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [activeTab, setActiveTab] = useState('overview') // overview, sql, backup, monitoring, clone, export

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    fetchDatabase()
  }, [id, token])

  async function fetchDatabase() {
    try {
      const res = await fetch(`${API_URL}/db/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch database')
      const data = await res.json()
      setDatabase(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-main">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="loading-spinner"></div>
          <p>Đang tải thông tin database...</p>
        </div>
      </div>
    )
  }

  if (error || !database) {
    return (
      <div className="dashboard-main">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <ErrorMessage message={error || 'Database not found'} />
          <button onClick={() => navigate('/app/databases')} style={{ marginTop: '20px' }}>
            Quay lại danh sách
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        {/* Header */}
      <div style={{
        padding: '24px 32px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <button
              onClick={() => navigate('/app/databases')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FiArrowLeft size={20} />
            </button>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
              {database.name}
            </h1>
            <span style={{
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: database.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2',
              color: database.status === 'ACTIVE' ? '#065f46' : '#991b1b'
            }}>
              {database.status}
            </span>
          </div>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Database ID: {database.id} • Created: {new Date(database.created_at).toLocaleDateString('vi-VN')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 32px'
      }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {[
            { id: 'overview', label: 'Overview', icon: <FiBarChart2 size={16} /> },
            { id: 'sql', label: 'SQL Query', icon: <FiCode size={16} /> },
            { id: 'backup', label: 'Backup & Restore', icon: <FiHardDrive size={16} /> },
            { id: 'monitoring', label: 'Monitoring', icon: <FiTrendingUp size={16} /> },
            { id: 'clone', label: 'Clone', icon: <FiCopy size={16} /> },
            { id: 'export', label: 'Export/Import', icon: <FiUpload size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? '600' : '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        padding: '32px',
        backgroundColor: '#f9fafb',
        overflowY: 'auto'
      }}>
        {error && <ErrorMessage message={error} onClose={() => setError(null)} />}
        {success && <SuccessMessage message={success} onClose={() => setSuccess(null)} />}

        {activeTab === 'overview' && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginBottom: '24px'
            }}>
              {/* Database Info Card */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                  Database Information
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Status</div>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      backgroundColor: database.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2',
                      color: database.status === 'ACTIVE' ? '#065f46' : '#991b1b'
                    }}>
                      {database.status}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Hostname</div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{database.hostname || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Port</div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{database.port || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Quota</div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>
                      {database.quota_mb ? `${database.quota_mb} MB` : 'Unlimited'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                  Quick Actions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => setActiveTab('sql')}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      background: 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14px'
                    }}
                  >
                    <FiCode size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Run SQL Query
                  </button>
                  <button
                    onClick={() => setActiveTab('backup')}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      background: 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <FiHardDrive size={16} /> Backup & Restore
                  </button>
                  <button
                    onClick={() => setActiveTab('monitoring')}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      background: 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <FiTrendingUp size={16} /> View Monitoring
                  </button>
                </div>
              </div>
            </div>

            {/* Connection Info & Reset Password */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginTop: '20px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                Connection & Security
              </h3>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <ConnectionInfo dbId={database.id} token={token} />
                <ResetPassword dbId={database.id} token={token} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sql' && database.status === 'ACTIVE' && (
          <SQLQueryExecutor databaseId={database.id} databaseName={database.name} token={token} />
        )}

        {activeTab === 'backup' && database.status === 'ACTIVE' && (
          <BackupManager databaseId={database.id} token={token} />
        )}

        {activeTab === 'monitoring' && database.status === 'ACTIVE' && (
          <DatabaseMonitoring databaseId={database.id} token={token} />
        )}

        {activeTab === 'clone' && database.status === 'ACTIVE' && (
          <CloneDatabase
            databaseId={database.id}
            databaseName={database.name}
            token={token}
            onSuccess={(cloneData) => {
              setSuccess(`Database "${cloneData.name}" đã được clone thành công!`)
              setTimeout(() => navigate('/app/databases'), 2000)
            }}
          />
        )}

        {activeTab === 'export' && database.status === 'ACTIVE' && (
          <ExportImportDatabase
            databaseId={database.id}
            databaseName={database.name}
            token={token}
            onSuccess={() => {
              setSuccess('Export/Import operation thành công!')
            }}
          />
        )}

        {database.status !== 'ACTIVE' && (
          <InfoMessage message={`Database is ${database.status}. Please wait for it to become ACTIVE before using features.`} />
        )}
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
            <FiDatabase size={24} color="white" />
          </div>
          <h2 style={{margin: 0, fontSize: '24px', fontWeight: '700', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>CloudDB</h2>
        </div>
      </div>
      <nav className="sidebar-nav">
        <Link to="/app" className="nav-item">
          <span className="nav-icon"><FiDatabase size={18} /></span>
          <span>Trang chủ</span>
        </Link>
        <Link to="/app/databases" className="nav-item active">
          <span className="nav-icon"><FiDatabase size={18} /></span>
          <span>Quản lý Database</span>
        </Link>
        <Link to="/app/subscriptions" className="nav-item">
          <span className="nav-icon"><FiDatabase size={18} /></span>
          <span>Gói dịch vụ</span>
        </Link>
        <Link to="/app/payments" className="nav-item">
          <span className="nav-icon"><FiDatabase size={18} /></span>
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
          <span className="nav-icon"><FiLogOut size={20} /></span>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  )
}

