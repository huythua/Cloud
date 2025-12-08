import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Databases from './pages/Databases'
import Subscriptions from './pages/Subscriptions'
import Payments from './pages/Payments'
import Usage from './pages/Usage'
import Profile from './pages/Profile'
import { AuthProvider, useAuth } from './AuthContext'
import './styles.css'
import logo from './assets/logo.svg'

function App(){
  function NavButtons(){
    const auth = useAuth()
    if(auth && auth.token){
      return (
        <div className="nav-links">
          <Link to="/app" className="nav-button">Trang chính</Link>
          <button className="nav-button" onClick={() => { auth.clearToken(); window.location.href = '/login' }}>Đăng xuất</button>
        </div>
      )
    }
    return (
      <div className="nav-links">
        <Link to="/login" className="nav-button">Đăng nhập</Link>
        <Link to="/register" className="nav-button primary">Đăng ký</Link>
      </div>
    )
  }
  return (
    <BrowserRouter>
      <AuthProvider>
      <div className="site-layout">
        <Routes>
          <Route path="/login" element={
            <>
              <nav className="nav">
                <div className="nav-inner">
                  <div className="brand">
                    <img src={logo} alt="CloudDB" className="logo" />
                    <div>
                      <div className="brand-title">CloudDB — Thuê & Dùng Database</div>
                      <div className="brand-sub">Nền tảng quản lý database cloud</div>
                    </div>
                  </div>
                  <NavButtons />
                </div>
              </nav>
              <div className="hero">
                <div className="container auth-wrap">
                  <Login/>
                </div>
              </div>
            </>
          } />
          <Route path="/register" element={
            <>
              <nav className="nav">
                <div className="nav-inner">
                  <div className="brand">
                    <img src={logo} alt="CloudDB" className="logo" />
                    <div>
                      <div className="brand-title">CloudDB — Thuê & Dùng Database</div>
                      <div className="brand-sub">Nền tảng quản lý database cloud</div>
                    </div>
                  </div>
                  <NavButtons />
                </div>
              </nav>
              <div className="hero">
                <div className="container auth-wrap">
                  <Register/>
                </div>
              </div>
            </>
          } />
          <Route path="/app" element={<Dashboard/>} />
          <Route path="/app/databases" element={<Databases/>} />
          <Route path="/app/subscriptions" element={<Subscriptions/>} />
          <Route path="/app/payments" element={<Payments/>} />
          <Route path="/app/usage" element={<Usage/>} />
          <Route path="/app/profile" element={<Profile/>} />
          <Route path="/" element={
            <>
              <nav className="nav">
                <div className="nav-inner">
                  <div className="brand">
                    <img src={logo} alt="CloudDB" className="logo" />
                    <div>
                      <div className="brand-title">CloudDB — Thuê & Dùng Database</div>
                      <div className="brand-sub">Nền tảng quản lý database cloud</div>
                    </div>
                  </div>
                  <NavButtons />
                </div>
              </nav>
              <div className="hero">
                <div className="container auth-wrap">
                  <Login/>
                </div>
              </div>
            </>
          } />
        </Routes>
      </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)
