import React, { useState } from 'react'
import { API_URL } from '../config'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { ErrorMessage, SuccessMessage } from '../components/ErrorMessage'
import { FiDatabase, FiClock, FiStar } from 'react-icons/fi'

export default function Register(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const navigate = useNavigate()
  const auth = useAuth()

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true)
      const res = await fetch(`${API_URL}/auth/google`)
      const data = await res.json()
      if (res.ok && data.auth_url) {
        // Redirect to Google OAuth
        window.location.href = data.auth_url
      } else {
        setError('Không thể kết nối với Google. Vui lòng thử lại.')
        setGoogleLoading(false)
      }
    } catch (err) {
      setError('Lỗi: ' + String(err))
      setGoogleLoading(false)
    }
  }

  const submit = async (e) =>{
    e.preventDefault()
    setError(null)
    setSuccess(null)
    
    // Validation
    if(password.length < 6){
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }
    
    try{
      setLoading(true)
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if(!res.ok){
        setError(data.detail || 'Đăng ký thất bại. Vui lòng thử lại.')
        setLoading(false)
        return
      }
      setSuccess('Đăng ký thành công! Đang chuyển đến trang đăng nhập...')
      setLoading(false)
      // Điều hướng về trang đăng nhập sau 1.5s
      setTimeout(()=>{
        navigate('/login')
      }, 1500)
    }catch(err){
      setError('Lỗi kết nối: ' + String(err))
      setLoading(false)
    }
  }

  return (
    <div className="auth-form-wrapper">
      {/* Logo và Brand */}
      <div className="auth-brand">
        <div className="auth-logo">
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            boxShadow: '0 8px 16px rgba(102, 126, 234, 0.3)',
            marginBottom: '16px'
          }}>
            <FiDatabase size={36} style={{ color: '#ffffff' }} />
          </div>
          <h1 style={{
            margin: 0,
            fontSize: '32px',
            fontWeight: '800',
            color: '#ffffff',
            textShadow: '0 2px 8px rgba(0,0,0,0.2)',
            marginBottom: '8px'
          }}>
            CloudDB
          </h1>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: 'rgba(255,255,255,0.9)',
            fontWeight: '500',
            textShadow: '0 1px 4px rgba(0,0,0,0.2)'
          }}>
            Database as a Service Platform
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="auth-form-card">
        <div className="auth-form-header">
          <h2 style={{margin: 0, fontSize: '28px', fontWeight: '700', color: '#1e293b', marginBottom: '8px'}}>
            Đăng ký
          </h2>
          <p style={{margin: 0, fontSize: '14px', color: '#475569'}}>
            Tạo tài khoản mới để bắt đầu sử dụng dịch vụ database cloud
          </p>
        </div>

        {error && <ErrorMessage message={error} onClose={() => setError(null)} />}
        {success && <SuccessMessage message={success} onClose={() => setSuccess(null)} autoClose={true} />}

        <form onSubmit={submit} className="auth-form">
          <div className="form-group">
            <label>Địa chỉ email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e=>setEmail(e.target.value)} 
              placeholder="your@email.com"
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Mật khẩu</label>
            <input 
              type="password" 
              value={password} 
              onChange={e=>setPassword(e.target.value)} 
              placeholder="Tối thiểu 6 ký tự"
              required 
              minLength="6"
            />
            <p className="hint" style={{marginTop: '4px', fontSize: '12px', color: '#64748b'}}>
              Mật khẩu phải có ít nhất 6 ký tự
            </p>
          </div>

          <button type="submit" className="btn-auth-primary" disabled={loading}>
            {loading ? (
              <>
                <FiClock size={16} style={{marginRight: '8px', display: 'inline-block'}} className="spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <FiStar size={16} style={{marginRight: '8px', display: 'inline-block'}} />
                Tạo tài khoản
              </>
            )}
          </button>
          
          <div className="auth-divider">
            <div className="divider-line"></div>
            <span className="divider-text">hoặc</span>
            <div className="divider-line"></div>
          </div>

          <button 
            type="button" 
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="btn-auth-google"
          >
            {googleLoading ? (
              'Đang chuyển hướng...'
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 18 18" style={{marginRight: '8px'}}>
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.965-2.184l-2.908-2.258c-.806.54-1.837.86-3.057.86-2.35 0-4.34-1.587-5.053-3.72H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.954 10.698c-.18-.54-.282-1.117-.282-1.698s.102-1.158.282-1.698V4.97H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.03l2.997-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.97L3.954 7.302C4.66 5.167 6.65 3.58 9 3.58z"/>
                </svg>
                Đăng ký bằng Google
              </>
            )}
          </button>
          
          <div className="auth-footer-link">
            <p style={{margin: 0, fontSize: '14px'}}>
              Đã có tài khoản?{' '}
              <Link to="/login">
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
