import React, { useState } from 'react'
import { API_URL } from '../config'
import { ErrorMessage, SuccessMessage } from './ErrorMessage'
import { FiUpload, FiDownload, FiX, FiAlertTriangle, FiCheck } from 'react-icons/fi'

export default function ExportImportDatabase({ databaseId, databaseName, token, onClose = null, onSuccess }) {
  const [activeTab, setActiveTab] = useState('export') // 'export' or 'import'
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  async function handleExport() {
    setExportLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`${API_URL}/db/${databaseId}/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Lỗi khi export database')
      }

      // Download file
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || `database_${databaseId}_${new Date().toISOString().split('T')[0]}.sql`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setSuccess('Export database thành công! File đã được tải về.')
      
      setTimeout(() => {
        if (onSuccess) onSuccess()
        if (onClose) onClose()
      }, 2000)

    } catch (err) {
      setError(err.message || 'Lỗi khi export database')
    } finally {
      setExportLoading(false)
    }
  }

  async function handleImport(e) {
    e.preventDefault()
    
    if (!selectedFile) {
      setError('Vui lòng chọn file SQL để import')
      return
    }

    if (!selectedFile.name.endsWith('.sql')) {
      setError('File phải có định dạng .sql')
      return
    }

    setImportLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const res = await fetch(`${API_URL}/db/${databaseId}/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || 'Lỗi khi import database')
      }

      setSuccess(`Import đã được khởi tạo. Import ID: ${data.id}. Quá trình import có thể mất vài phút.`)
      
      setTimeout(() => {
        if (onSuccess) onSuccess(data)
        if (onClose) onClose()
      }, 3000)

    } catch (err) {
      setError(err.message || 'Lỗi khi import database')
    } finally {
      setImportLoading(false)
    }
  }

  // Content component (reusable for both modal and non-modal)
  const content = (
    <>
      {/* Header - only show if modal mode */}
      {onClose && (
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiDownload size={20} /> Export / <FiUpload size={20} /> Import Database
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <FiX size={20} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <button
          onClick={() => setActiveTab('export')}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            color: activeTab === 'export' ? '#3b82f6' : '#6b7280',
            borderBottom: activeTab === 'export' ? '2px solid #3b82f6' : '2px solid transparent',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <FiDownload size={16} /> Export
        </button>
        <button
          onClick={() => setActiveTab('import')}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            color: activeTab === 'import' ? '#3b82f6' : '#6b7280',
            borderBottom: activeTab === 'import' ? '2px solid #3b82f6' : '2px solid transparent',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <FiUpload size={16} /> Import
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '24px' }}>
          {error && <ErrorMessage message={error} onClose={() => setError(null)} />}
          {success && <SuccessMessage message={success} onClose={() => setSuccess(null)} />}

          <div style={{
            padding: '12px',
            backgroundColor: '#f0f9ff',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #bae6fd'
          }}>
            <div style={{ fontSize: '13px', color: '#0369a1', marginBottom: '4px' }}>
              Database:
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#0c4a6e' }}>
              {databaseName}
            </div>
          </div>

          {activeTab === 'export' && (
            <div>
              <div style={{
                padding: '12px',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #fde68a'
              }}>
                <div style={{ fontSize: '13px', color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <FiDownload size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong>Export:</strong> Tải xuống database dưới dạng SQL dump file. 
                    File này có thể được sử dụng để backup hoặc import vào database khác.
                  </div>
                </div>
              </div>

              <button
                onClick={handleExport}
                disabled={exportLoading}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: exportLoading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: exportLoading ? 'not-allowed' : 'pointer',
                  opacity: exportLoading ? 0.6 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                {exportLoading ? 'Đang export...' : (
                  <>
                    <FiDownload size={16} style={{ marginRight: '6px' }} /> Export Database
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'import' && (
            <form onSubmit={handleImport}>
              <div style={{
                padding: '12px',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #fde68a'
              }}>
                <div style={{ fontSize: '13px', color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <FiAlertTriangle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong>Lưu ý:</strong> Import sẽ ghi đè dữ liệu hiện có trong database. 
                    Hãy đảm bảo bạn đã backup database trước khi import.
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '6px',
                  color: '#374151'
                }}>
                  Chọn file SQL <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="file"
                  accept=".sql"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  disabled={importLoading}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
                {selectedFile && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '13px',
                    color: '#059669',
                    padding: '8px',
                    backgroundColor: '#d1fae5',
                    borderRadius: '4px'
                  }}>
                    <FiCheck size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Đã chọn: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={importLoading}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      backgroundColor: 'white',
                      color: '#374151',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: importLoading ? 'not-allowed' : 'pointer',
                      opacity: importLoading ? 0.5 : 1,
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!importLoading) e.currentTarget.style.backgroundColor = '#f9fafb'
                    }}
                    onMouseLeave={(e) => {
                      if (!importLoading) e.currentTarget.style.backgroundColor = 'white'
                    }}
                  >
                    Hủy
                  </button>
                )}
                <button
                  type="submit"
                  disabled={importLoading || !selectedFile}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    background: (importLoading || !selectedFile) ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: (importLoading || !selectedFile) ? 'not-allowed' : 'pointer',
                    opacity: (importLoading || !selectedFile) ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {importLoading ? 'Đang import...' : (
                    <>
                      <FiUpload size={16} /> Import Database
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </>
  )

  // If onClose is provided, render as modal
  if (onClose) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }} onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '600px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}>
          {content}
        </div>
      </div>
    )
  }

  // Otherwise, render as regular component (for DatabaseDetail page)
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb'
    }}>
      {content}
    </div>
  )
}

