import React, { useState, useEffect } from 'react'
import { API_URL } from '../config'
import { ErrorMessage } from './ErrorMessage'
import { FiLink, FiCopy, FiCheck } from 'react-icons/fi'

export default function ConnectionInfo({ dbId, database, token }) {
  const databaseId = dbId || database?.id
  const [connectionInfo, setConnectionInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copySuccess, setCopySuccess] = useState(null)

  useEffect(() => {
    if (!databaseId) return
    async function fetchConnectionInfo() {
      try {
        const res = await fetch(`${API_URL}/db/${databaseId}/connection`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setConnectionInfo(data)
        } else {
          const data = await res.json().catch(() => ({}))
          setError(data.detail || 'Không thể lấy thông tin kết nối')
        }
      } catch (err) {
        setError(err.message || 'Lỗi khi lấy thông tin kết nối')
      } finally {
        setLoading(false)
      }
    }
    if (databaseId) {
      fetchConnectionInfo()
    }
  }, [databaseId, token])

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess('Copied!')
      setTimeout(() => setCopySuccess(null), 2000)
    })
  }

  if (loading) {
    return <div>Loading connection info...</div>
  }

  if (error) {
    return <ErrorMessage message={error} />
  }

  if (!connectionInfo) {
    return null
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
        <FiLink size={18} /> Connection Info
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[
          { label: 'Host', value: connectionInfo.hostname },
          { label: 'Port', value: connectionInfo.port },
          { label: 'Database', value: connectionInfo.database_name },
          { label: 'Username', value: connectionInfo.username }
        ].map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', minWidth: '80px' }}>
              {item.label}:
            </div>
            <div style={{
              flex: 1,
              fontSize: '13px',
              fontFamily: 'monospace',
              backgroundColor: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #d1d5db'
            }}>
              {item.value || 'N/A'}
            </div>
            <button
              onClick={() => copyToClipboard(item.value || '')}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                background: 'white',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {copySuccess === 'Copied!' ? <FiCheck size={14} /> : <FiCopy size={14} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

