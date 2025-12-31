import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { API_URL } from '../config'
import { useAuth } from '../AuthContext'

export default function GoogleCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const auth = useAuth()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setError('Không nhận được mã xác thực từ Google')
      setLoading(false)
      return
    }

    async function handleCallback() {
      try {
        const res = await fetch(`${API_URL}/auth/google/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        })

        const data = await res.json()
        if (!res.ok) {
          setError(data.detail || 'Đăng nhập Google thất bại')
          setLoading(false)
          return
        }

        // Lưu token và redirect
        auth.saveToken(data.access_token)
        navigate('/app')
      } catch (err) {
        setError('Lỗi kết nối: ' + String(err))
        setLoading(false)
      }
    }

    handleCallback()
  }, [searchParams, navigate, auth])

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: 420, margin: '0 auto' }}>
        <h1 className="form-heading">Đang xử lý đăng nhập Google...</h1>
        <p className="hint">Vui lòng đợi trong giây lát</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card" style={{ maxWidth: 420, margin: '0 auto' }}>
        <h1 className="form-heading">Lỗi đăng nhập</h1>
        <p className="msg" style={{ color: 'red' }}>{error}</p>
        <button onClick={() => navigate('/login')}>Quay lại đăng nhập</button>
      </div>
    )
  }

  return null
}

