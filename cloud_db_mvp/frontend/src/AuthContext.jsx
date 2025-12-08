import React, { createContext, useContext, useState, useEffect } from 'react'
import { API_URL } from './config'

const AuthContext = createContext(null)

export function AuthProvider({ children }){
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if(token){
      fetchUser()
    } else {
      setUser(null)
    }
  }, [token])

  async function fetchUser(){
    if(!token) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if(res.ok){
        const data = await res.json()
        setUser(data)
      } else {
        // Token invalid, clear it
        clearToken()
      }
    } catch(err) {
      console.error('Failed to fetch user:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveToken = (t) => {
    if(t){
      localStorage.setItem('token', t)
      setToken(t)
    }
  }
  
  const clearToken = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ 
      token, 
      user, 
      saveToken, 
      clearToken, 
      balance: user?.balance_cents || 0, 
      points: user?.points || 0,
      refreshUser: fetchUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(){
  return useContext(AuthContext)
}
