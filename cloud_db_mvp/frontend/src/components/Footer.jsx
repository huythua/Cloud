import React from 'react'
import { Link } from 'react-router-dom'
import { FiGithub, FiMail, FiPhone, FiGlobe, FiClock } from 'react-icons/fi'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="footer-component" style={{
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      color: '#e2e8f0',
      padding: '48px 24px 24px',
      marginTop: '48px',
      borderTop: '1px solid rgba(148, 163, 184, 0.1)',
      width: '100%',
      flexShrink: 0,
      display: 'block'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '32px',
        marginBottom: '32px'
      }}>
        {/* Brand Section */}
        <div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '700',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            CloudDB
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#94a3b8',
            lineHeight: 1.6,
            marginBottom: '16px'
          }}>
            Nền tảng Database as a Service (DBaaS) hàng đầu Việt Nam. 
            Quản lý và thuê database cloud một cách dễ dàng và hiệu quả.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(148, 163, 184, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e2e8f0',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(148, 163, 184, 0.2)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <FiGithub size={18} />
            </a>
            <a 
              href="mailto:support@clouddb.vn" 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(148, 163, 184, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e2e8f0',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(148, 163, 184, 0.2)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <FiMail size={18} />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#f1f5f9'
          }}>
            Liên kết nhanh
          </h4>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0
          }}>
            <li style={{ marginBottom: '12px' }}>
              <Link 
                to="/app" 
                style={{
                  color: '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '14px',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                Trang chủ
              </Link>
            </li>
            <li style={{ marginBottom: '12px' }}>
              <Link 
                to="/app/databases" 
                style={{
                  color: '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '14px',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                Quản lý Database
              </Link>
            </li>
            <li style={{ marginBottom: '12px' }}>
              <Link 
                to="/app/subscriptions" 
                style={{
                  color: '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '14px',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                Gói dịch vụ
              </Link>
            </li>
            <li style={{ marginBottom: '12px' }}>
              <Link 
                to="/app/payments" 
                style={{
                  color: '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '14px',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                Thanh toán
              </Link>
            </li>
            <li style={{ marginBottom: '12px' }}>
              <Link 
                to="/app/profile" 
                style={{
                  color: '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '14px',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                Tài khoản
              </Link>
            </li>
          </ul>
        </div>

        {/* Support & Contact */}
        <div>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#f1f5f9'
          }}>
            Hỗ trợ & Liên hệ
          </h4>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0
          }}>
            <li style={{ marginBottom: '12px', fontSize: '14px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiMail size={16} style={{ color: '#e2e8f0' }} />
              <div>
                <strong style={{ color: '#e2e8f0' }}>Email:</strong><br />
                <a 
                  href="mailto:support@clouddb.vn" 
                  style={{
                    color: '#667eea',
                    textDecoration: 'none'
                  }}
                >
                  support@clouddb.vn
                </a>
              </div>
            </li>
            <li style={{ marginBottom: '12px', fontSize: '14px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiPhone size={16} style={{ color: '#e2e8f0' }} />
              <div>
                <strong style={{ color: '#e2e8f0' }}>Hotline:</strong><br />
                <a 
                  href="tel:+84190000000" 
                  style={{
                    color: '#667eea',
                    textDecoration: 'none'
                  }}
                >
                  1900 000 000
                </a>
              </div>
            </li>
            <li style={{ marginBottom: '12px', fontSize: '14px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiGlobe size={16} style={{ color: '#e2e8f0' }} />
              <div>
                <strong style={{ color: '#e2e8f0' }}>Website:</strong><br />
                <a 
                  href="https://cloud.tadalabs.vn" 
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#667eea',
                    textDecoration: 'none'
                  }}
                >
                  cloud.tadalabs.vn
                </a>
              </div>
            </li>
            <li style={{ marginBottom: '12px', fontSize: '14px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiClock size={16} style={{ color: '#e2e8f0' }} />
              <div>
                <strong style={{ color: '#e2e8f0' }}>Giờ hỗ trợ:</strong><br />
                24/7 - Hỗ trợ kỹ thuật trực tuyến
              </div>
            </li>
          </ul>
        </div>

        {/* Legal & Info */}
        <div>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#f1f5f9'
          }}>
            Thông tin pháp lý
          </h4>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0
          }}>
            <li style={{ marginBottom: '12px', fontSize: '14px', color: '#94a3b8' }}>
              <a 
                href="#" 
                style={{
                  color: '#94a3b8',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                Điều khoản sử dụng
              </a>
            </li>
            <li style={{ marginBottom: '12px', fontSize: '14px', color: '#94a3b8' }}>
              <a 
                href="#" 
                style={{
                  color: '#94a3b8',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                Chính sách bảo mật
              </a>
            </li>
            <li style={{ marginBottom: '12px', fontSize: '14px', color: '#94a3b8' }}>
              <a 
                href="#" 
                style={{
                  color: '#94a3b8',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                Chính sách hoàn tiền
              </a>
            </li>
            <li style={{ marginBottom: '12px', fontSize: '14px', color: '#94a3b8' }}>
              <a 
                href="#" 
                style={{
                  color: '#94a3b8',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                Câu hỏi thường gặp (FAQ)
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div style={{
        borderTop: '1px solid rgba(148, 163, 184, 0.1)',
        paddingTop: '24px',
        textAlign: 'center',
        fontSize: '14px',
        color: '#64748b'
      }}>
        <p style={{ margin: 0 }}>
          © {currentYear} <strong style={{ color: '#e2e8f0' }}>CloudDB</strong> - Database as a Service Platform. 
          Tất cả quyền được bảo lưu.
        </p>
        <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
          Phát triển bởi <strong style={{ color: '#667eea' }}>TadaLabs</strong> | 
          Địa chỉ: Việt Nam | 
          Giấy phép kinh doanh: 0123456789
        </p>
      </div>
    </footer>
  )
}

