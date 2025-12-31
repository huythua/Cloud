import React, { useState } from 'react'
import { API_URL } from '../config'
import { ErrorMessage, SuccessMessage } from './ErrorMessage'
import { FiKey } from 'react-icons/fi'

export default function ResetPassword({ dbId, databaseId, token }) {
  const id = dbId || databaseId
  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (formData.new_password !== formData.confirm_password) {
      setError('Mật khẩu không khớp')
      return
    }

    if (formData.new_password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`${API_URL}/db/${id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ new_password: formData.new_password })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Lỗi khi đổi mật khẩu')
      }

      setSuccess('Mật khẩu đã được đổi thành công!')
      setFormData({ new_password: '', confirm_password: '' })
    } catch (err) {
      setError(err.message || 'Lỗi khi đổi mật khẩu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      flex: 1,
      padding: '16px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FiKey size={18} /> Reset Password
      </h4>
      
      {error && <ErrorMessage message={error} onClose={() => setError(null)} />}
      {success && <SuccessMessage message={success} onClose={() => setSuccess(null)} />}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <input
            type="password"
            placeholder="New Password"
            value={formData.new_password}
            onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <input
            type="password"
            placeholder="Confirm Password"
            value={formData.confirm_password}
            onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontSize: '13px',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Đang đổi...' : 'Reset Password'}
        </button>
      </form>
    </div>
  )
}

