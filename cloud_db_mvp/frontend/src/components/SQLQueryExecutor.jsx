import React, { useState } from 'react'
import { API_URL } from '../config'
import { ErrorMessage, SuccessMessage } from './ErrorMessage'
import { FiCode, FiInfo, FiPlay, FiClock } from 'react-icons/fi'

export default function SQLQueryExecutor({ databaseId, databaseName, token }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [queryHistory, setQueryHistory] = useState([])

  async function executeQuery() {
    if (!query.trim()) {
      setError('Vui lòng nhập SQL query')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)
    setResults(null)

    try {
      const res = await fetch(`${API_URL}/db/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: query.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || 'Lỗi khi execute query')
      }

      setResults(data)
      setSuccess(data.message || 'Query executed successfully')
      
      // Add to history
      setQueryHistory(prev => [query.trim(), ...prev.filter(q => q !== query.trim())].slice(0, 10))
    } catch (err) {
      setError(err.message || 'Lỗi khi execute query')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      executeQuery()
    }
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FiCode size={20} /> SQL Query Executor
      </h2>

      {error && <ErrorMessage message={error} onClose={() => setError(null)} />}
      {success && <SuccessMessage message={success} onClose={() => setSuccess(null)} />}

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '8px',
          color: '#374151'
        }}>
          SQL Query
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="SELECT * FROM table_name;"
          rows={8}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '14px',
            fontFamily: 'Monaco, Menlo, "Courier New", monospace',
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiInfo size={14} /> Tip: Press Ctrl+Enter (or Cmd+Enter on Mac) to execute query
          </span>
        </div>
      </div>

      {queryHistory.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Recent Queries:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {queryHistory.slice(0, 5).map((q, idx) => (
              <button
                key={idx}
                onClick={() => setQuery(q)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  background: 'white',
                  fontSize: '12px',
                  cursor: 'pointer',
                  maxWidth: '200px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={q}
              >
                {q.substring(0, 30)}...
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={executeQuery}
        disabled={loading || !query.trim()}
        style={{
          padding: '10px 20px',
          borderRadius: '6px',
          border: 'none',
          background: (loading || !query.trim()) ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontSize: '14px',
          fontWeight: '500',
          cursor: (loading || !query.trim()) ? 'not-allowed' : 'pointer',
          opacity: (loading || !query.trim()) ? 0.6 : 1
        }}
      >
        {loading ? (
          <>
            <FiClock size={16} className="spin" style={{ marginRight: '6px' }} /> Executing...
          </>
        ) : (
          <>
            <FiPlay size={16} style={{ marginRight: '6px' }} /> Execute Query
          </>
        )}
      </button>

      {results && (
        <div style={{ marginTop: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            padding: '12px',
            backgroundColor: '#f0f9ff',
            borderRadius: '6px'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#0369a1' }}>Query Type: {results.query_type}</div>
              <div style={{ fontSize: '12px', color: '#0369a1' }}>
                Execution Time: {results.execution_time_ms}ms
                {results.query_type !== 'SELECT' && ` • Affected Rows: ${results.affected_rows}`}
              </div>
            </div>
          </div>

          {results.query_type === 'SELECT' && results.columns && results.columns.length > 0 && (
            <div style={{
              overflowX: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '6px'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    {results.columns.map((col, idx) => (
                      <th
                        key={idx}
                        style={{
                          padding: '10px 12px',
                          textAlign: 'left',
                          borderBottom: '1px solid #e5e7eb',
                          fontWeight: '600',
                          color: '#374151'
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.rows && results.rows.length > 0 ? (
                    results.rows.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        style={{
                          borderBottom: '1px solid #f3f4f6'
                        }}
                      >
                        {row.map((cell, cellIdx) => (
                          <td
                            key={cellIdx}
                            style={{
                              padding: '10px 12px',
                              color: cell === null ? '#9ca3af' : '#111827'
                            }}
                          >
                            {cell === null ? <span style={{ fontStyle: 'italic' }}>NULL</span> : String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={results.columns.length}
                        style={{
                          padding: '20px',
                          textAlign: 'center',
                          color: '#6b7280'
                        }}
                      >
                        No rows returned
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {results.row_count > 0 && (
                <div style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#6b7280',
                  backgroundColor: '#f9fafb',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  Showing {results.row_count} row(s)
                </div>
              )}
            </div>
          )}

          {results.query_type !== 'SELECT' && (
            <div style={{
              padding: '16px',
              backgroundColor: '#f0fdf4',
              borderRadius: '6px',
              border: '1px solid #bbf7d0'
            }}>
              <div style={{ fontSize: '14px', color: '#166534', fontWeight: '500' }}>
                ✓ Query executed successfully
              </div>
              <div style={{ fontSize: '13px', color: '#15803d', marginTop: '4px' }}>
                {results.message}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

