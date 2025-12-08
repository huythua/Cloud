import React, { useState } from 'react'
import { API_URL } from '../config'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Register(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const auth = useAuth()

  const submit = async (e) =>{
    e.preventDefault()
    setMsg(null)
    try{
      setLoading(true)
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if(!res.ok){
        setMsg(data.detail || JSON.stringify(data))
        setLoading(false)
        return
      }
      setMsg('Đăng ký thành công. Bạn sẽ được chuyển đến trang đăng nhập...')
      setLoading(false)
      // Điều hướng về trang đăng nhập sau 0.8s
      setTimeout(()=>{
        navigate('/login')
      }, 800)
    }catch(err){
      setMsg(String(err))
      setLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="card" style={{maxWidth:420,margin:'0 auto'}}>
        <h1 className="form-heading">Đăng ký</h1>
        <p className="hint">Tạo tài khoản để bắt đầu thuê và quản lý database</p>
        <label>Địa chỉ email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <label>Mật khẩu</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button type="submit">{loading ? 'Đang xử lý...' : 'Đăng ký'}</button>
        {msg && <p className="msg">{msg}</p>}
        <p className="hint">Đã có tài khoản? <a href="/login">Đăng nhập</a></p>
      </form>
    </div>
  )
}
