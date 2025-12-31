import React, { useState, useEffect } from 'react'
import { API_URL } from '../config'
import { ErrorMessage, SuccessMessage, InfoMessage } from './ErrorMessage'
import { FiHardDrive, FiX, FiPlus, FiRefreshCw, FiDownload, FiTrash2, FiAlertTriangle, FiClock, FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi'

export default function BackupManager({ databaseId, token, onClose = null }) {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [info, setInfo] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showRestoreForm, setShowRestoreForm] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState(null)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [activeRestoreId, setActiveRestoreId] = useState(null)
  const [restoreStatus, setRestoreStatus] = useState(null)

  const [backupName, setBackupName] = useState('')
  const [backupDescription, setBackupDescription] = useState('')

  useEffect(() => {
    if (databaseId && token) {
      fetchBackups()
    }
  }, [databaseId, token, filterStatus])

  async function fetchBackups() {
    setLoading(true)
    setError(null)
    try {
      const url = new URL(`${API_URL}/db/${databaseId}/backups`)
      if (filterStatus !== 'ALL') {
        url.searchParams.set('status', filterStatus)
      }
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: 'Lỗi khi tải danh sách backup' }))
        setError(data.detail || 'Lỗi khi tải danh sách backup')
        setLoading(false)
        return
      }
      const data = await res.json()
      setBackups(data)
    } catch (err) {
      setError('Lỗi kết nối: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateBackup() {
    if (!backupName.trim()) {
      setError('Vui lòng nhập tên backup')
      return
    }

    setCreating(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/db/${databaseId}/backup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: backupName.trim(),
          description: backupDescription.trim() || null
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || 'Tạo backup thất bại')
        setCreating(false)
        return
      }

      setSuccess('Đã tạo backup thành công! Đang xử lý...')
      setBackupName('')
      setBackupDescription('')
      setShowCreateForm(false)
      
      // Refresh backups sau 2 giây
      setTimeout(() => {
        fetchBackups()
      }, 2000)
      
      setCreating(false)
    } catch (err) {
      setError('Lỗi kết nối: ' + err.message)
      setCreating(false)
    }
  }

  async function handleRestore(backupId) {
    if (!window.confirm('Bạn có chắc muốn restore database từ backup này? Dữ liệu hiện tại sẽ bị ghi đè!')) {
      return
    }

    setRestoring(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`${API_URL}/db/${databaseId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          backup_id: backupId
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || 'Restore thất bại')
        setRestoring(false)
        return
      }

      // Lưu restore_id để theo dõi
      setActiveRestoreId(data.id)
      setRestoreStatus(data.status)
      setSuccess('Đã bắt đầu restore database. Đang theo dõi tiến trình...')
      setShowRestoreForm(false)
      setSelectedBackup(null)
      
      // Bắt đầu polling để theo dõi status
      startRestorePolling(data.id)
      
      setRestoring(false)
    } catch (err) {
      setError('Lỗi kết nối: ' + err.message)
      setRestoring(false)
    }
  }

  async function checkRestoreStatus(restoreId) {
    try {
      const res = await fetch(`${API_URL}/db/${databaseId}/restores/${restoreId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        setRestoreStatus(data.status)
        
        if (data.status === 'COMPLETED') {
          setSuccess('Restore database thành công!')
          setActiveRestoreId(null)
          fetchBackups() // Refresh backups list
          return true // Stop polling
        } else if (data.status === 'FAILED') {
          setError(`Restore thất bại: ${data.error_message || 'Unknown error'}`)
          setActiveRestoreId(null)
          return true // Stop polling
        }
        // Continue polling if IN_PROGRESS or PENDING
        return false
      }
    } catch (err) {
      console.error('Failed to check restore status:', err)
    }
    return false // Continue polling on error
  }

  function startRestorePolling(restoreId) {
    const pollInterval = setInterval(async () => {
      const shouldStop = await checkRestoreStatus(restoreId)
      if (shouldStop) {
        clearInterval(pollInterval)
      }
    }, 2000) // Poll every 2 seconds
    
    // Stop polling after 5 minutes (timeout)
    setTimeout(() => {
      clearInterval(pollInterval)
      if (activeRestoreId === restoreId) {
        setInfo('Restore đang mất nhiều thời gian hơn dự kiến. Vui lòng kiểm tra lại sau.')
        setActiveRestoreId(null)
      }
    }, 300000) // 5 minutes timeout
  }

  async function handleDeleteBackup(backupId) {
    if (!window.confirm('Bạn có chắc muốn xóa backup này?')) {
      return
    }

    try {
      const res = await fetch(`${API_URL}/db/${databaseId}/backups/${backupId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || 'Xóa backup thất bại')
        return
      }

      setSuccess('Đã xóa backup thành công!')
      fetchBackups()
    } catch (err) {
      setError('Lỗi kết nối: ' + err.message)
    }
  }

  async function handleDownloadBackup(backupId) {
    try {
      const res = await fetch(`${API_URL}/db/${databaseId}/backups/${backupId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: 'Lỗi khi tải backup' }))
        setError(data.detail || 'Lỗi khi tải backup')
        return
      }

      // Tạo blob và download
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup_${backupId}.sql`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setSuccess('Đã tải backup thành công!')
    } catch (err) {
      setError('Lỗi kết nối: ' + err.message)
    }
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function formatSize(sizeMb) {
    if (!sizeMb) return 'N/A'
    if (sizeMb < 1) {
      return `${(sizeMb * 1024).toFixed(2)} KB`
    }
    return `${parseFloat(sizeMb).toFixed(2)} MB`
  }

  function getStatusBadge(status) {
    const statusConfig = {
      PENDING: { color: '#f59e0b', label: 'Đang chờ', icon: <FiClock size={14} /> },
      IN_PROGRESS: { color: '#3b82f6', label: 'Đang xử lý', icon: <FiLoader size={14} className="spin" /> },
      COMPLETED: { color: '#10b981', label: 'Hoàn thành', icon: <FiCheckCircle size={14} /> },
      FAILED: { color: '#ef4444', label: 'Thất bại', icon: <FiXCircle size={14} /> }
    }

    const config = statusConfig[status] || { color: '#6b7280', label: status, icon: <FiAlertTriangle size={14} /> }

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: `${config.color}20`,
        color: config.color,
        fontSize: '12px',
        fontWeight: '500'
      }}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
    )
  }

  // Content component (reusable for both modal and non-modal)
  const content = (
    <>
      {/* Header - only show if modal mode */}
      {onClose && (
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiHardDrive size={20} /> Quản lý Backup & Restore
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <FiX size={20} />
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{
        padding: '24px',
        overflowY: 'auto',
        flex: 1
      }}>
          {error && <ErrorMessage message={error} onClose={() => setError(null)} />}
          {success && <SuccessMessage message={success} onClose={() => setSuccess(null)} autoClose={true} />}
          {info && <InfoMessage message={info} onClose={() => setInfo(null)} />}

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <button
              className="btn-primary"
              onClick={() => {
                setShowCreateForm(true)
                setShowRestoreForm(false)
              }}
              disabled={creating}
            >
              <FiPlus size={16} style={{ marginRight: '6px' }} /> Tạo Backup
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setShowRestoreForm(true)
                setShowCreateForm(false)
              }}
              disabled={restoring}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FiRefreshCw size={16} /> Restore từ Backup
            </button>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="PENDING">Đang chờ</option>
              <option value="IN_PROGRESS">Đang xử lý</option>
              <option value="FAILED">Thất bại</option>
            </select>
          </div>

          {/* Create Backup Form */}
          {showCreateForm && (
            <div style={{
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>
                Tạo Backup Mới
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                    Tên backup *
                  </label>
                  <input
                    type="text"
                    value={backupName}
                    onChange={(e) => setBackupName(e.target.value)}
                    placeholder="Ví dụ: Backup trước khi cập nhật"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                    Mô tả (tùy chọn)
                  </label>
                  <textarea
                    value={backupDescription}
                    onChange={(e) => setBackupDescription(e.target.value)}
                    placeholder="Mô tả về backup này..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-primary"
                    onClick={handleCreateBackup}
                    disabled={creating || !backupName.trim()}
                  >
                    {creating ? 'Đang tạo...' : 'Tạo Backup'}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setShowCreateForm(false)
                      setBackupName('')
                      setBackupDescription('')
                    }}
                    disabled={creating}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Restore Status Display */}
          {activeRestoreId && restoreStatus && (
            <div style={{
              padding: '16px',
              backgroundColor: restoreStatus === 'COMPLETED' ? '#d1fae5' : 
                              restoreStatus === 'FAILED' ? '#fee2e2' : '#dbeafe',
              borderRadius: '8px',
              marginBottom: '20px',
              border: `1px solid ${restoreStatus === 'COMPLETED' ? '#a7f3d0' : 
                                        restoreStatus === 'FAILED' ? '#fecaca' : '#bfdbfe'}`
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {restoreStatus === 'COMPLETED' ? (
                  <>
                    <FiCheckCircle size={18} /> Restore Hoàn Thành
                  </>
                ) : restoreStatus === 'FAILED' ? (
                  <>
                    <FiXCircle size={18} /> Restore Thất Bại
                  </>
                ) : restoreStatus === 'IN_PROGRESS' ? (
                  <>
                    <FiLoader size={18} className="spin" /> Đang Restore...
                  </>
                ) : (
                  <>
                    <FiClock size={18} /> Đang Chờ Restore...
                  </>
                )}
              </h3>
              <p style={{ margin: 0, fontSize: '14px' }}>
                {restoreStatus === 'IN_PROGRESS' && 'Đang khôi phục dữ liệu từ backup. Vui lòng đợi...'}
                {restoreStatus === 'PENDING' && 'Restore đang được xử lý...'}
                {restoreStatus === 'COMPLETED' && 'Database đã được khôi phục thành công!'}
                {restoreStatus === 'FAILED' && 'Restore thất bại. Vui lòng thử lại.'}
              </p>
              {restoreStatus === 'IN_PROGRESS' && (
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '3px solid #3b82f6',
                    borderTop: '3px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span style={{ fontSize: '13px', color: '#1e40af' }}>Đang xử lý...</span>
                </div>
              )}
            </div>
          )}

          {/* Restore Form */}
          {showRestoreForm && (
            <div style={{
              padding: '16px',
              backgroundColor: '#fef3c7',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #fcd34d'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiAlertTriangle size={18} /> Restore Database
              </h3>
              <p style={{ marginBottom: '12px', fontSize: '14px', color: '#78350f' }}>
                Chọn backup để restore. Dữ liệu hiện tại sẽ bị ghi đè!
              </p>
              {backups.filter(b => b.status === 'COMPLETED').length === 0 ? (
                <p style={{ color: '#92400e', fontSize: '14px' }}>
                  Không có backup nào đã hoàn thành để restore.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {backups.filter(b => b.status === 'COMPLETED').map(backup => (
                    <div
                      key={backup.id}
                      style={{
                        padding: '12px',
                        backgroundColor: 'white',
                        borderRadius: '6px',
                        border: '1px solid #fcd34d',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                          {backup.name || `Backup #${backup.id}`}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {formatDate(backup.created_at)} • {formatSize(backup.size_mb)}
                        </div>
                      </div>
                      <button
                        className="btn-primary"
                        onClick={() => handleRestore(backup.id)}
                        disabled={restoring}
                        style={{ fontSize: '14px', padding: '6px 12px' }}
                      >
                        {restoring ? 'Đang restore...' : 'Restore'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowRestoreForm(false)
                  setSelectedBackup(null)
                }}
                disabled={restoring}
                style={{ marginTop: '12px' }}
              >
                Hủy
              </button>
            </div>
          )}

          {/* Backups List */}
          <div>
            <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>
              Danh sách Backups ({backups.length})
            </h3>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                Đang tải...
              </div>
            ) : backups.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                color: '#6b7280'
              }}>
                <FiHardDrive size={48} style={{ marginBottom: '12px', color: '#9ca3af' }} />
                <p>Chưa có backup nào</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  Tạo backup đầu tiên để bảo vệ dữ liệu của bạn
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {backups.map(backup => (
                  <div
                    key={backup.id}
                    style={{
                      padding: '16px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '8px'
                        }}>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                            {backup.name || `Backup #${backup.id}`}
                          </h4>
                          {getStatusBadge(backup.status)}
                        </div>
                        {backup.description && (
                          <p style={{
                            margin: '4px 0',
                            fontSize: '14px',
                            color: '#6b7280'
                          }}>
                            {backup.description}
                          </p>
                        )}
                        <div style={{
                          display: 'flex',
                          gap: '16px',
                          fontSize: '12px',
                          color: '#9ca3af',
                          marginTop: '8px'
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FiClock size={12} /> Tạo: {formatDate(backup.created_at)}
                          </span>
                          {backup.completed_at && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <FiCheckCircle size={12} /> Hoàn thành: {formatDate(backup.completed_at)}
                            </span>
                          )}
                          {backup.size_mb && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <FiHardDrive size={12} /> Kích thước: {formatSize(backup.size_mb)}
                            </span>
                          )}
                        </div>
                        {backup.error_message && (
                          <div style={{
                            marginTop: '8px',
                            padding: '8px',
                            backgroundColor: '#fee2e2',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: '#991b1b'
                          }}>
                            <FiXCircle size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Lỗi: {backup.error_message}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      {backup.status === 'COMPLETED' && (
                        <>
                          <button
                            className="btn-secondary"
                            onClick={() => handleDownloadBackup(backup.id)}
                            style={{ fontSize: '13px', padding: '6px 12px' }}
                          >
                            <FiDownload size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Tải xuống
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => handleRestore(backup.id)}
                            disabled={restoring}
                            style={{ fontSize: '13px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <FiRefreshCw size={14} /> Restore
                          </button>
                        </>
                      )}
                      {backup.status !== 'IN_PROGRESS' && (
                        <button
                          className="btn-secondary"
                          onClick={() => handleDeleteBackup(backup.id)}
                          style={{
                            fontSize: '13px',
                            padding: '6px 12px',
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #fecaca',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <FiTrash2 size={14} /> Xóa
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
  )

  // If onClose is provided, render as modal
  if (onClose) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }} onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}>
          {content}
        </div>
      </div>
    )
  }

  // Otherwise, render as regular component (for DatabaseDetail page)
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb'
    }}>
      {content}
    </div>
  )
}

