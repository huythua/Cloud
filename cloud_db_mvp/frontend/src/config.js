// config.js - central place for API URL configuration
// Uses Vite environment variable VITE_API_URL when provided
// config.js - Nơi cấu hình URL backend (bằng tiếng Việt)
// Sử dụng biến môi trường Vite: VITE_API_URL (nếu không có sẽ dùng localhost mặc định)
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
