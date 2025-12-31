import React, { useState, useEffect } from 'react'
import { API_URL } from '../config'
import { ErrorMessage, SuccessMessage, InfoMessage } from './ErrorMessage'
import { FiBarChart2, FiX, FiActivity, FiUsers, FiClock, FiTrendingUp, FiDatabase, FiLink, FiCheckCircle } from 'react-icons/fi'

export default function DatabaseMonitoring({ databaseId, token, onClose = null }) {
  const [metrics, setMetrics] = useState(null)
  const [realtimeMetrics, setRealtimeMetrics] = useState(null)
  const [connections, setConnections] = useState(null)
  const [slowQueries, setSlowQueries] = useState(null)
  const [performanceSummary, setPerformanceSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [timeframe, setTimeframe] = useState('1h')
  const [activeTab, setActiveTab] = useState('overview') // overview, connections, slow-queries

  useEffect(() => {
    if (databaseId && token) {
      fetchAllData()
      // Poll real-time metrics every 5 seconds
      const interval = setInterval(() => {
        fetchRealtimeMetrics()
        fetchPerformanceSummary()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [databaseId, token, timeframe])

  async function fetchAllData() {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([
        fetchMetrics(),
        fetchRealtimeMetrics(),
        fetchConnections(),
        fetchSlowQueries(),
        fetchPerformanceSummary()
      ])
    } catch (err) {
      setError('Lỗi khi tải dữ liệu: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchMetrics() {
    try {
      const res = await fetch(`${API_URL}/db/${databaseId}/metrics?timeframe=${timeframe}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setMetrics(data)
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err)
    }
  }

  async function fetchRealtimeMetrics() {
    try {
      const res = await fetch(`${API_URL}/db/${databaseId}/metrics/realtime`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setRealtimeMetrics(data)
      }
    } catch (err) {
      console.error('Failed to fetch realtime metrics:', err)
    }
  }

  async function fetchConnections() {
    try {
      const res = await fetch(`${API_URL}/db/${databaseId}/connections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setConnections(data)
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err)
    }
  }

  async function fetchSlowQueries() {
    try {
      const res = await fetch(`${API_URL}/db/${databaseId}/slow-queries?limit=20&min_duration_ms=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSlowQueries(data)
      }
    } catch (err) {
      console.error('Failed to fetch slow queries:', err)
    }
  }

  async function fetchPerformanceSummary() {
    try {
      const res = await fetch(`${API_URL}/db/${databaseId}/performance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setPerformanceSummary(data)
      }
    } catch (err) {
      console.error('Failed to fetch performance summary:', err)
    }
  }

  function formatNumber(num) {
    if (num === null || num === undefined) return 'N/A'
    const value = parseFloat(num)
    // Format số: dùng dấu phẩy cho phần nghìn, dấu chấm cho phần thập phân
    // Nếu số >= 1000 và không có phần thập phân đáng kể, làm tròn thành số nguyên
    if (value >= 1000) {
      // Kiểm tra xem có phần thập phân đáng kể không (< 0.01)
      if (value % 1 < 0.01) {
        return Math.round(value).toLocaleString('en-US')
      } else {
        return value.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 0 })
      }
    } else {
      return value.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
    }
  }

  function formatDuration(ms) {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${ms.toFixed(2)} ms`
    return `${(ms / 1000).toFixed(2)} s`
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
            <FiBarChart2 size={20} /> Monitoring & Performance Metrics
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

      {/* Content */}
      <div style={{
        padding: '24px',
        overflowY: 'auto',
        flex: 1
      }}>
        {error && <ErrorMessage message={error} onClose={() => setError(null)} />}

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <button
              onClick={() => setActiveTab('overview')}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'overview' ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === 'overview' ? '#3b82f6' : '#6b7280',
                fontWeight: activeTab === 'overview' ? '600' : '400',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <FiTrendingUp size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('connections')}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'connections' ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === 'connections' ? '#3b82f6' : '#6b7280',
                fontWeight: activeTab === 'connections' ? '600' : '400',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FiUsers size={16} /> Connections ({connections?.active || 0})
            </button>
            <button
              onClick={() => setActiveTab('slow-queries')}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'slow-queries' ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === 'slow-queries' ? '#3b82f6' : '#6b7280',
                fontWeight: activeTab === 'slow-queries' ? '600' : '400',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FiClock size={16} /> Slow Queries ({slowQueries?.length || 0})
            </button>
          </div>

          {/* Timeframe Selector */}
          {activeTab === 'overview' && (
            <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>Timeframe:</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Đang tải dữ liệu...
            </div>
          )}

          {/* Overview Tab */}
          {!loading && activeTab === 'overview' && (
            <div>
              {/* Performance Summary Cards */}
              {performanceSummary && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '8px',
                    border: '1px solid #bae6fd'
                  }}>
                    <div style={{ fontSize: '12px', color: '#0369a1', marginBottom: '4px' }}>Queries/sec</div>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#0c4a6e' }}>
                      {formatNumber(performanceSummary.qps)}
                    </div>
                  </div>
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '8px',
                    border: '1px solid #bbf7d0'
                  }}>
                    <div style={{ fontSize: '12px', color: '#166534', marginBottom: '4px' }}>Avg Response Time</div>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#14532d' }}>
                      {formatDuration(performanceSummary.avg_response_time_ms)} ms
                    </div>
                  </div>
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '8px',
                    border: '1px solid #fde68a'
                  }}>
                    <div style={{ fontSize: '12px', color: '#92400e', marginBottom: '4px' }}>Active Connections</div>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#78350f' }}>
                      {performanceSummary.active_connections} / {performanceSummary.max_connections}
                    </div>
                  </div>
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#fee2e2',
                    borderRadius: '8px',
                    border: '1px solid #fecaca'
                  }}>
                    <div style={{ fontSize: '12px', color: '#991b1b', marginBottom: '4px' }}>Slow Queries (24h)</div>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#7f1d1d' }}>
                      {performanceSummary.slow_queries_count}
                    </div>
                  </div>
                </div>
              )}

              {/* Real-time Metrics */}
              {realtimeMetrics && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>
                    Real-time Metrics
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Storage Size</div>
                      <div style={{ fontSize: '18px', fontWeight: '600' }}>
                        {formatNumber(realtimeMetrics.storage?.size_mb || realtimeMetrics.metrics?.MEMORY?.[0]?.value || 0)} MB
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Active Connections</div>
                      <div style={{ fontSize: '18px', fontWeight: '600' }}>
                        {realtimeMetrics.connections?.active || realtimeMetrics.metrics?.CONNECTIONS?.[0]?.value || 0}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>QPS (Queries/sec)</div>
                      <div style={{ fontSize: '18px', fontWeight: '600' }}>
                        {formatNumber(realtimeMetrics.queries?.per_second || realtimeMetrics.metrics?.QUERIES?.[0]?.value || 0)} queries/sec
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Historical Metrics Table */}
              {metrics && (
                <div style={{
                  padding: '20px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                      Historical Metrics ({timeframe})
                    </h3>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '13px', 
                      color: '#6b7280',
                      lineHeight: '1.5'
                    }}>
                      <strong>Giá trị hiện tại:</strong> Số liệu mới nhất được đo • 
                      <strong> Thấp nhất:</strong> Giá trị nhỏ nhất trong {timeframe} • 
                      <strong> Trung bình:</strong> Giá trị trung bình của tất cả các điểm dữ liệu • 
                      <strong> Cao nhất:</strong> Giá trị lớn nhất trong {timeframe} • 
                      <strong> Số lần đo:</strong> Tổng số lần metrics được thu thập trong {timeframe}
                    </p>
                    <div style={{ 
                      marginTop: '12px', 
                      padding: '10px 14px', 
                      backgroundColor: '#eff6ff', 
                      borderRadius: '6px',
                      border: '1px solid #dbeafe',
                      fontSize: '12px',
                      color: '#1e40af'
                    }}>
                      <strong>📊 Lưu ý về QPS metric:</strong> Giá trị hiển thị là <strong>Queries Per Second (QPS)</strong> - số lượng queries được xử lý mỗi giây. 
                      Đây là metric quan trọng để đánh giá hoạt động và hiệu suất của database. QPS cao cho thấy database đang xử lý nhiều queries, QPS thấp có thể cho thấy database ít hoạt động hoặc có vấn đề về performance.
                    </div>
                  </div>
                  
                  {(() => {
                    const metricLabels = {
                      'CONNECTIONS': { label: 'Kết nối đang hoạt động', unit: '', color: '#3b82f6' },
                      'MEMORY': { label: 'Dung lượng lưu trữ', unit: ' MB', color: '#10b981' },
                      'QUERIES': { label: 'QPS (Queries Per Second)', unit: ' queries/sec', color: '#f59e0b' },
                      'CPU': { label: 'CPU Usage', unit: '%', color: '#ef4444' },
                      'RESPONSE_TIME': { label: 'Thời gian phản hồi', unit: ' ms', color: '#8b5cf6' },
                      'THROUGHPUT': { label: 'Throughput', unit: '', color: '#06b6d4' }
                    }
                    
                    const metricsList = Object.keys(metrics.metrics || {}).filter(type => {
                      const dataPoints = metrics.metrics[type] || []
                      return dataPoints.length > 0
                    })
                    
                    if (metricsList.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                          <FiBarChart2 size={48} style={{ marginBottom: '12px', color: '#9ca3af', margin: '0 auto' }} />
                          <p style={{ fontSize: '16px', margin: '8px 0' }}>Chưa có dữ liệu metrics</p>
                          <p style={{ fontSize: '14px', marginTop: '8px', color: '#6b7280' }}>
                            Metrics sẽ được collect tự động khi có hoạt động trên database
                          </p>
                        </div>
                      )
                    }
                    
                    return (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ 
                          width: '100%', 
                          borderCollapse: 'collapse',
                          fontSize: '14px'
                        }}>
                          <thead>
                            <tr style={{ 
                              borderBottom: '2px solid #e5e7eb',
                              backgroundColor: '#f9fafb'
                            }}>
                              <th style={{ 
                                padding: '12px 16px', 
                                textAlign: 'left', 
                                fontWeight: '600',
                                color: '#374151',
                                fontSize: '13px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Metric</th>
                              <th style={{ 
                                padding: '12px 16px', 
                                textAlign: 'right', 
                                fontWeight: '600',
                                color: '#374151',
                                fontSize: '13px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}
                              title="Giá trị mới nhất được đo tại thời điểm hiện tại"
                              >Giá trị hiện tại</th>
                              <th style={{ 
                                padding: '12px 16px', 
                                textAlign: 'right', 
                                fontWeight: '600',
                                color: '#374151',
                                fontSize: '13px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}
                              title="Giá trị nhỏ nhất trong khoảng thời gian đã chọn"
                              >Thấp nhất (Min)</th>
                              <th style={{ 
                                padding: '12px 16px', 
                                textAlign: 'right', 
                                fontWeight: '600',
                                color: '#374151',
                                fontSize: '13px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}
                              title="Giá trị trung bình của tất cả các điểm dữ liệu trong khoảng thời gian"
                              >Trung bình (Avg)</th>
                              <th style={{ 
                                padding: '12px 16px', 
                                textAlign: 'right', 
                                fontWeight: '600',
                                color: '#374151',
                                fontSize: '13px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}
                              title="Giá trị lớn nhất trong khoảng thời gian đã chọn"
                              >Cao nhất (Max)</th>
                              <th style={{ 
                                padding: '12px 16px', 
                                textAlign: 'center', 
                                fontWeight: '600',
                                color: '#374151',
                                fontSize: '13px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}
                              title="Tổng số lần đo/metrics được thu thập trong khoảng thời gian"
                              >Số lần đo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {metricsList.map((type, idx) => {
                              const dataPoints = metrics.metrics[type] || []
                              if (dataPoints.length === 0) return null
                              
                              const metricInfo = metricLabels[type] || { label: type, unit: '', color: '#3b82f6' }
                              const values = dataPoints.map(p => p.value)
                              const minValue = Math.min(...values)
                              const maxValue = Math.max(...values)
                              const avgValue = values.reduce((a, b) => a + b, 0) / values.length
                              const latestValue = values[values.length - 1]
                              
                              // QUERIES giờ là QPS (queries per second), không cần tính delta nữa
                              // QPS đã là rate rồi, hiển thị trực tiếp
                              
                              // Tính phần trăm so với max để hiển thị màu
                              const percentOfMax = maxValue > 0 ? (latestValue / maxValue) * 100 : 0
                              const isHigh = latestValue >= avgValue * 1.2
                              const isLow = latestValue <= avgValue * 0.8
                              
                              // Icon cho từng metric
                              const getIcon = () => {
                                switch(type) {
                                  case 'CONNECTIONS': return <FiUsers size={18} />
                                  case 'MEMORY': return <FiDatabase size={18} />
                                  case 'QUERIES': return <FiActivity size={18} />
                                  case 'RESPONSE_TIME': return <FiClock size={18} />
                                  case 'CPU': return <FiTrendingUp size={18} />
                                  case 'THROUGHPUT': return <FiBarChart2 size={18} />
                                  default: return null
                                }
                              }
                              
                              return (
                                <tr 
                                  key={type} 
                                  style={{ 
                                    borderBottom: '1px solid #e5e7eb',
                                    backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb',
                                    transition: 'background-color 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f3f4f6'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'white' : '#f9fafb'
                                  }}
                                >
                                  <td style={{ padding: '16px', fontWeight: '500', color: '#111827' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                          width: '4px',
                                          height: '24px',
                                          backgroundColor: metricInfo.color,
                                          borderRadius: '2px',
                                          flexShrink: 0
                                        }} />
                                        <span style={{ color: metricInfo.color, display: 'flex', alignItems: 'center' }}>
                                          {getIcon()}
                                        </span>
                                      <span style={{ fontWeight: '600' }}>{metricInfo.label}</span>
                                    </div>
                                    </div>
                                  </td>
                                  <td style={{ 
                                    padding: '16px', 
                                    textAlign: 'right'
                                  }}>
                                    <div style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '6px 12px',
                                      borderRadius: '6px',
                                      backgroundColor: isHigh ? '#fef2f2' : isLow ? '#f0fdf4' : '#fef3c7',
                                      border: `1px solid ${isHigh ? '#fecaca' : isLow ? '#bbf7d0' : '#fde68a'}`,
                                      fontWeight: '700',
                                      fontSize: '15px',
                                      color: isHigh ? '#dc2626' : isLow ? '#16a34a' : '#d97706'
                                    }}
                                    title={`Giá trị hiện tại: ${formatNumber(latestValue)}${metricInfo.unit}`}
                                    >
                                      <span>{formatNumber(latestValue)}</span>
                                      <span style={{ fontSize: '12px', fontWeight: '500', opacity: 0.8 }}>
                                        {metricInfo.unit}
                                      </span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '16px', textAlign: 'right' }}>
                                    <div style={{
                                      display: 'inline-block',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      backgroundColor: '#f0f9ff',
                                      color: '#0369a1',
                                      fontWeight: '600',
                                      fontSize: '14px'
                                    }}
                                    title={`Giá trị thấp nhất: ${formatNumber(minValue)}${metricInfo.unit}`}
                                    >
                                      {formatNumber(minValue)}{metricInfo.unit}
                                    </div>
                                  </td>
                                  <td style={{ padding: '16px', textAlign: 'right' }}>
                                    <div style={{
                                      display: 'inline-block',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      backgroundColor: '#f9fafb',
                                      color: '#374151',
                                      fontWeight: '600',
                                      fontSize: '14px',
                                      border: '1px solid #e5e7eb'
                                    }}
                                    title={`Giá trị trung bình: ${formatNumber(avgValue)}${metricInfo.unit}`}
                                    >
                                      {formatNumber(avgValue)}{metricInfo.unit}
                                    </div>
                                  </td>
                                  <td style={{ padding: '16px', textAlign: 'right' }}>
                                    <div style={{
                                      display: 'inline-block',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      backgroundColor: '#fef2f2',
                                      color: '#dc2626',
                                      fontWeight: '600',
                                      fontSize: '14px'
                                    }}
                                    title={`Giá trị cao nhất: ${formatNumber(maxValue)}${metricInfo.unit}`}
                                    >
                                      {formatNumber(maxValue)}{metricInfo.unit}
                                    </div>
                                  </td>
                                  <td style={{ padding: '16px', textAlign: 'center' }}>
                                    <div style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 10px',
                                      borderRadius: '12px',
                                      backgroundColor: '#eff6ff',
                                      color: '#1e40af',
                                      fontWeight: '600',
                                      fontSize: '13px'
                                    }}
                                    title={`Đã thu thập ${dataPoints.length} điểm dữ liệu trong khoảng thời gian ${timeframe}`}
                                    >
                                      <FiBarChart2 size={14} />
                                      {dataPoints.length}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Connections Tab */}
          {!loading && activeTab === 'connections' && (
            <div>
              {connections ? (
                <>
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '8px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '14px', color: '#0369a1' }}>Active Connections</div>
                        <div style={{ fontSize: '32px', fontWeight: '600', color: '#0c4a6e' }}>
                          {connections.active} / {connections.max_connections}
                        </div>
                      </div>
                      <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        border: '8px solid #bfdbfe',
                        borderTop: '8px solid #3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        fontWeight: '600',
                        color: '#1e40af'
                      }}>
                        {Math.round((connections.active / connections.max_connections) * 100)}%
                      </div>
                    </div>
                  </div>

                  <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>
                    Connection List ({connections.connections?.length || 0})
                  </h3>
                  {connections.connections && connections.connections.length > 0 ? (
                    <div style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>ID</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>User</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Host</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Database</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Command</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Time</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>State</th>
                          </tr>
                        </thead>
                        <tbody>
                          {connections.connections.map((conn, idx) => (
                            <tr key={conn.id || idx} style={{ borderTop: '1px solid #e5e7eb' }}>
                              <td style={{ padding: '12px', fontSize: '13px' }}>{conn.id}</td>
                              <td style={{ padding: '12px', fontSize: '13px' }}>{conn.user}</td>
                              <td style={{ padding: '12px', fontSize: '13px' }}>{conn.host}</td>
                              <td style={{ padding: '12px', fontSize: '13px' }}>{conn.db || '-'}</td>
                              <td style={{ padding: '12px', fontSize: '13px' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: conn.command === 'Query' ? '#dbeafe' : '#f3f4f6',
                                  color: conn.command === 'Query' ? '#1e40af' : '#6b7280',
                                  fontSize: '12px'
                                }}>
                                  {conn.command}
                                </span>
                              </td>
                              <td style={{ padding: '12px', fontSize: '13px' }}>{conn.time}s</td>
                              <td style={{ padding: '12px', fontSize: '13px' }}>{conn.state || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      color: '#6b7280'
                    }}>
                      <FiLink size={48} style={{ marginBottom: '12px', color: '#9ca3af' }} />
                      <p>Không có active connections</p>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  Đang tải thông tin connections...
                </div>
              )}
            </div>
          )}

          {/* Slow Queries Tab */}
          {!loading && activeTab === 'slow-queries' && (
            <div>
              {slowQueries !== null ? (
                slowQueries.length > 0 ? (
                  <div style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f9fafb' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Query</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Duration</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Rows Examined</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Rows Sent</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slowQueries.map((query, idx) => (
                          <tr key={query.id || idx} style={{ borderTop: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '12px', fontSize: '13px' }}>
                              <code style={{
                                backgroundColor: '#f3f4f6',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                maxWidth: '400px',
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }} title={query.query_text}>
                                {query.query_text.substring(0, 50)}...
                              </code>
                            </td>
                            <td style={{ padding: '12px', fontSize: '13px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: query.duration_ms > 5000 ? '#fee2e2' : '#fef3c7',
                                color: query.duration_ms > 5000 ? '#991b1b' : '#92400e',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}>
                                {formatDuration(query.duration_ms)}
                              </span>
                            </td>
                            <td style={{ padding: '12px', fontSize: '13px' }}>{query.rows_examined || '-'}</td>
                            <td style={{ padding: '12px', fontSize: '13px' }}>{query.rows_sent || '-'}</td>
                            <td style={{ padding: '12px', fontSize: '13px' }}>
                              {query.timestamp ? new Date(query.timestamp).toLocaleString('vi-VN') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    color: '#6b7280'
                  }}>
                    <FiCheckCircle size={48} style={{ marginBottom: '12px', color: '#10b981' }} />
                    <p>Không có slow queries</p>
                    <p style={{ fontSize: '13px', marginTop: '8px' }}>
                      Database của bạn đang hoạt động tốt!
                    </p>
                  </div>
                )
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  Đang tải slow queries...
                </div>
              )}
            </div>
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
          maxWidth: '1200px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
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

