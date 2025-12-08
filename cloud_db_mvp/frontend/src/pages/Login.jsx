import React, { useState } from 'react'
import { API_URL } from '../config'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Login(){
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
      const fd = new URLSearchParams()
      fd.append('username', email)
      fd.append('password', password)
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        body: fd,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      const data = await res.json()
      if(!res.ok){
        setMsg(data.detail || JSON.stringify(data))
        setLoading(false)
        return
      }
      // Lưu token vào context và localStorage
      auth.saveToken(data.access_token)
      setMsg('Đăng nhập thành công')
      setLoading(false)
      // Điều hướng tới trang chính
      navigate('/app')
    }catch(err){
      setMsg(String(err))
      setLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="card" style={{maxWidth:420,margin:'0 auto'}}>
        <h1 className="form-heading">Đăng nhập</h1>
        <p className="hint">Đăng nhập để quản lý database và tài khoản của bạn</p>
        <label>Địa chỉ email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <label>Mật khẩu</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button type="submit">{loading ? 'Đang xử lý...' : 'Đăng nhập'}</button>
        {msg && <p className="msg">{msg}</p>}
        <p className="hint">Bạn chưa có tài khoản? <a href="/register">Đăng ký</a></p>
      </form>
    </div>
  )
}
