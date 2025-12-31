import React, { useState } from 'react'
import { API_URL } from '../config'
import { ErrorMessage, SuccessMessage } from './ErrorMessage'
import { FiCopy, FiX, FiAlertTriangle } from 'react-icons/fi'

export default function CloneDatabase({ databaseId, databaseName, token, onClose = null, onSuccess }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  async function handleClone(e) {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Vui lòng nhập tên database')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`${API_URL}/db/${databaseId}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || 'Lỗi khi clone database')
      }

      setSuccess(`Đang clone database "${name}". Clone operation ID: ${data.id}`)
      
      // Call onSuccess callback sau 2 giây
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(data)
        }
        if (onClose) {
          onClose()
        }
      }, 2000)

    } catch (err) {
      setError(err.message || 'Lỗi khi clone database')
    } finally {
      setLoading(false)
    }
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
            <FiCopy size={20} /> Clone Database
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
      <div style={{ padding: '24px' }}>
          {error && <ErrorMessage message={error} onClose={() => setError(null)} />}
          {success && <SuccessMessage message={success} onClose={() => setSuccess(null)} />}

          <div style={{
            padding: '12px',
            backgroundColor: '#f0f9ff',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #bae6fd'
          }}>
            <div style={{ fontSize: '13px', color: '#0369a1', marginBottom: '4px' }}>
              Source Database:
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#0c4a6e' }}>
              {databaseName}
            </div>
          </div>

          <form onSubmit={handleClone}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '6px',
                color: '#374151'
              }}>
                Tên Database Mới <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên database mới"
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '6px',
                color: '#374151'
              }}>
                Mô tả (tùy chọn)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả về database clone này..."
                rows={3}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            <div style={{
              padding: '12px',
              backgroundColor: '#fef3c7',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #fde68a'
            }}>
              <div style={{ fontSize: '13px', color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <FiAlertTriangle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <strong>Lưu ý:</strong> Quá trình clone sẽ:
                <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                  <li>Tạo backup của database hiện tại</li>
                  <li>Tạo database mới với tên bạn đã nhập</li>
                  <li>Restore data từ backup vào database mới</li>
                </ul>
                Quá trình này có thể mất vài phút tùy vào kích thước database.
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.currentTarget.style.backgroundColor = '#f9fafb'
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) e.currentTarget.style.backgroundColor = 'white'
                  }}
                >
                  Hủy
                </button>
              )}
              <button
                type="submit"
                disabled={loading || !name.trim()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: (loading || !name.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (loading || !name.trim()) ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {loading ? 'Đang clone...' : (
                  <>
                    <FiCopy size={16} /> Clone Database
                  </>
                )}
              </button>
            </div>
          </form>
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
          maxWidth: '500px',
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

