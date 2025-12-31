import React, { useEffect } from 'react'
import { FiXCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi'

export function ErrorMessage({ message, onClose, autoClose = false, autoCloseDelay = 5000 }) {
  useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(() => {
        onClose()
      }, autoCloseDelay)
      return () => clearTimeout(timer)
    }
  }, [autoClose, onClose, autoCloseDelay])

  if (!message) return null

  return (
    <div className="alert alert-error" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderRadius: '8px',
      background: '#fee2e2',
      border: '1px solid #fecaca',
      color: '#991b1b',
      marginBottom: '16px',
      animation: 'slideDown 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <FiXCircle size={20} />
        <div style={{ flex: 1 }}>
          <strong style={{ display: 'block', marginBottom: '4px' }}>Lỗi</strong>
          <div style={{ fontSize: '14px', whiteSpace: 'pre-line' }}>{message}</div>
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#991b1b',
            padding: '0',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(153, 27, 27, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          <FiX size={18} />
        </button>
      )}
    </div>
  )
}

export function SuccessMessage({ message, onClose, autoClose = true, autoCloseDelay = 5000 }) {
  useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(() => {
        onClose()
      }, autoCloseDelay)
      return () => clearTimeout(timer)
    }
  }, [autoClose, onClose, autoCloseDelay])

  if (!message) return null

  return (
    <div className="alert alert-success" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderRadius: '8px',
      background: '#d1fae5',
      border: '1px solid #a7f3d0',
      color: '#065f46',
      marginBottom: '16px',
      animation: 'slideDown 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <FiCheckCircle size={20} />
        <div style={{ flex: 1 }}>
          <strong style={{ display: 'block', marginBottom: '4px' }}>Thành công</strong>
          <div style={{ fontSize: '14px', whiteSpace: 'pre-line' }}>{message}</div>
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#065f46',
            padding: '0',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(6, 95, 70, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          <FiX size={18} />
        </button>
      )}
    </div>
  )
}

export function InfoMessage({ message, onClose }) {
  if (!message) return null

  return (
    <div className="alert alert-info" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderRadius: '8px',
      background: '#dbeafe',
      border: '1px solid #bfdbfe',
      color: '#1e40af',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <FiInfo size={20} />
        <div style={{ flex: 1, fontSize: '14px', whiteSpace: 'pre-line' }}>{message}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#1e40af',
            padding: '0',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(30, 64, 175, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          <FiX size={18} />
        </button>
      )}
    </div>
  )
}

