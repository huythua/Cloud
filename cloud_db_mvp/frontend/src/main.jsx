import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import GoogleCallback from './pages/GoogleCallback'
import Dashboard from './pages/Dashboard'
import Databases from './pages/Databases'
import DatabaseDetail from './pages/DatabaseDetail'
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
              <div className="auth-page">
                <div className="auth-container">
                  <Login/>
                </div>
              </div>
            </>
          } />
          <Route path="/register" element={
            <>
              <div className="auth-page">
                <div className="auth-container">
                  <Register/>
                </div>
              </div>
            </>
          } />
          <Route path="/auth/google/callback" element={
            <>
              <nav className="nav">
                <div className="nav-inner">
                  <div className="brand">
                    <img src={logo} alt="CloudDB" className="logo" />
                    <div>
                      <div className="brand-title">CloudDB</div>
                      <div className="brand-sub">Database as a Service Platform</div>
                    </div>
                  </div>
                </div>
              </nav>
              <div className="hero">
                <div className="container auth-wrap">
                  <GoogleCallback/>
                </div>
              </div>
            </>
          } />
          <Route path="/app" element={<Dashboard/>} />
          <Route path="/app/databases" element={<Databases/>} />
          <Route path="/app/databases/:id" element={<DatabaseDetail/>} />
          <Route path="/app/subscriptions" element={<Subscriptions/>} />
          <Route path="/app/payments" element={<Payments/>} />
          <Route path="/app/usage" element={<Usage/>} />
          <Route path="/app/profile" element={<Profile/>} />
          <Route path="/" element={
            <>
              <div className="auth-page">
                <div className="auth-container">
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
