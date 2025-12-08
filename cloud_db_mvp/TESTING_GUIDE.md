# 📋 Hướng Dẫn Test - Cloud DB MVP

## 🔐 1. XÁC THỰC (Authentication)

### 1.1 Đăng ký tài khoản
**Trang:** `/register` hoặc `/` (chưa đăng nhập)

**Luồng hoạt động:**
1. Truy cập trang đăng ký
2. Nhập email và mật khẩu
3. Click "Đăng ký"
4. Hệ thống gọi API `POST /auth/register`
5. Nếu thành công → Chuyển đến trang đăng nhập
6. Nếu email đã tồn tại → Hiển thị lỗi

**Test cases:**
- ✅ Đăng ký với email mới → Thành công
- ✅ Đăng ký với email đã tồn tại → Lỗi "Email already registered"
- ✅ Đăng ký với email không hợp lệ → Validation error

---

### 1.2 Đăng nhập
**Trang:** `/login`

**Luồng hoạt động:**
1. Nhập email và mật khẩu
2. Click "Đăng nhập"
3. Hệ thống gọi API `POST /auth/login` (OAuth2 form)
4. Nhận JWT token
5. Lưu token vào localStorage và AuthContext
6. Tự động fetch user profile từ `GET /me`
7. Chuyển đến Dashboard (`/app`)

**Test cases:**
- ✅ Đăng nhập với thông tin đúng → Thành công, chuyển đến Dashboard
- ✅ Đăng nhập với mật khẩu sai → Lỗi "Invalid credentials"
- ✅ Đăng nhập với email không tồn tại → Lỗi "Invalid credentials"

---

### 1.3 Đăng xuất
**Vị trí:** Sidebar footer (nút "Đăng xuất")

**Luồng hoạt động:**
1. Click nút "Đăng xuất" ở sidebar
2. Xóa token khỏi localStorage
3. Clear AuthContext
4. Chuyển về trang `/login`

---

## 🏠 2. DASHBOARD (Trang chủ)

**Trang:** `/app`

**Tính năng:**
- Hiển thị 4 stat cards:
  - 💰 Số dư tài khoản (từ `user.balance_cents`)
  - ⭐ Điểm tích lũy (từ `user.points`)
  - 🗄️ Database đang dùng (active/total từ `/usage/stats`)
  - 📦 Gói đang dùng (từ `/subscriptions/active`)

- Quick Actions:
  - ➕ Tạo Database mới → Link đến `/app/databases?action=create`
  - 📦 Đăng ký gói → Link đến `/app/subscriptions`
  - 💳 Nạp tiền → Link đến `/app/payments`

- Recent Activity: (Hiện tại placeholder)

**Luồng hoạt động:**
1. Khi vào Dashboard, tự động gọi:
   - `GET /me` → Lấy thông tin user
   - `GET /db/list` → Lấy danh sách databases
   - `GET /subscriptions/active` → Lấy subscription active
   - `GET /usage/stats` → Lấy thống kê tổng quan
2. Hiển thị dữ liệu trong stat cards
3. Click vào Quick Actions → Chuyển đến trang tương ứng

**Test cases:**
- ✅ Xem được số dư, điểm, số database, số subscription
- ✅ Click "Tạo Database mới" → Mở modal tạo database
- ✅ Click "Đăng ký gói" → Chuyển đến trang Subscriptions
- ✅ Click "Nạp tiền" → Chuyển đến trang Payments

---

## 🗄️ 3. QUẢN LÝ DATABASE

**Trang:** `/app/databases`

### 3.1 Xem danh sách Database
**Luồng hoạt động:**
1. Tự động gọi `GET /db/list` khi vào trang
2. Hiển thị danh sách databases dạng grid cards
3. Mỗi card hiển thị:
   - Tên database
   - Status (ACTIVE, PENDING, FAILED, DELETED) với màu tương ứng
   - Quota (MB)
   - Hostname:Port (nếu có)
   - Progress bar (nếu có stats)
   - Các nút: 🔄 Refresh stats, 🔌 Connection info, 🔑 Reset password, 🗑️ Delete

**Test cases:**
- ✅ Hiển thị danh sách databases của user
- ✅ Empty state khi chưa có database nào

---

### 3.2 Tạo Database mới
**Luồng hoạt động:**
1. Click nút "➕ Tạo Database mới" hoặc từ Quick Actions
2. Modal form hiện ra với các trường:
   - Tên Database (required)
   - Database User (required)
   - Database Password (required)
   - Quota (MB, default 100, min 10, max 10000)
3. Submit form → Gọi `POST /db/create`
4. Backend tạo metadata → Gọi Provisioner tạo DB vật lý trên MySQL
5. Nếu thành công → Đóng modal, refresh danh sách
6. Nếu thất bại → Hiển thị lỗi

**Test cases:**
- ✅ Tạo database thành công → Database xuất hiện trong danh sách với status ACTIVE
- ✅ Tạo database với quota lớn → Thành công
- ✅ Tạo database với tên trùng → (Backend sẽ xử lý)
- ✅ Tạo database nhưng MySQL lỗi → Status FAILED

---

### 3.3 Xem thông tin kết nối Database
**Luồng hoạt động:**
1. Click nút 🔌 trên database card (chỉ hiện khi status = ACTIVE)
2. Modal hiện ra
3. Gọi `GET /db/{db_id}/connection`
4. Hiển thị:
   - Hostname
   - Port
   - Database Name (db_{id})
   - Username
   - Password
   - Connection String
5. Có nút 📋 Copy cho từng field

**Test cases:**
- ✅ Xem được đầy đủ thông tin kết nối
- ✅ Copy từng field → Clipboard được copy đúng
- ✅ Copy connection string → Có thể dùng để kết nối

---

### 3.4 Reset Password Database
**Luồng hoạt động:**
1. Click nút 🔑 trên database card (chỉ hiện khi status = ACTIVE)
2. Modal form hiện ra
3. Nhập:
   - Mật khẩu mới (required, min 6 ký tự)
   - Xác nhận mật khẩu mới (required)
4. Submit → Gọi `POST /db/{db_id}/reset-password`
5. Backend xóa user cũ, tạo lại với password mới
6. Nếu thành công → Alert "Đổi mật khẩu thành công!"

**Test cases:**
- ✅ Reset password thành công → Có thể kết nối với password mới
- ✅ Reset với mật khẩu < 6 ký tự → Validation error
- ✅ Reset với mật khẩu không khớp → Error "Mật khẩu mới không khớp"

---

### 3.5 Xem thống kê Database
**Luồng hoạt động:**
1. Tự động gọi `GET /db/{db_id}/stats` khi database card render (nếu status = ACTIVE)
2. Hiển thị:
   - Used MB (mock data, random 10-80% của quota)
   - Progress bar với màu:
     - Xanh (#3b82f6) nếu < 80%
     - Đỏ (#ef4444) nếu >= 80%
   - Phần trăm đã sử dụng

**Test cases:**
- ✅ Hiển thị progress bar với dữ liệu mock
- ✅ Progress bar đổi màu khi > 80%

---

### 3.6 Xóa Database
**Luồng hoạt động:**
1. Click nút 🗑️ trên database card
2. Confirm dialog: "Bạn có chắc muốn xóa database này?"
3. Nếu confirm → Gọi `DELETE /db/{db_id}`
4. Backend xóa DB vật lý và user trên MySQL
5. Cập nhật status = DELETED trong metadata
6. Refresh danh sách

**Test cases:**
- ✅ Xóa database thành công → Database biến mất khỏi danh sách
- ✅ Cancel confirm → Không xóa
- ✅ Xóa database đang active → DB vật lý bị xóa trên MySQL

---

## 📦 4. QUẢN LÝ GÓI DỊCH VỤ (Subscriptions)

**Trang:** `/app/subscriptions`

### 4.1 Xem bảng giá
**Luồng hoạt động:**
1. Tự động gọi `GET /plans` khi vào trang
2. Hiển thị grid các plan cards với:
   - Tên gói
   - Giá (VND/tháng hoặc "Miễn phí")
   - Storage (MB hoặc GB)
   - Số users allowed
   - Description
   - Nút "Đăng ký ngay" (disabled nếu đang dùng)

**Test cases:**
- ✅ Hiển thị đầy đủ các gói từ seed data
- ✅ Gói đang dùng có badge "Đang dùng" và nút disabled

---

### 4.2 Đăng ký gói
**Luồng hoạt động:**
1. Click nút "Đăng ký ngay" trên plan card
2. Gọi `POST /subscriptions` với:
   - `plan_id`: ID của gói
   - `auto_renew`: true (default)
3. Backend kiểm tra:
   - Plan có tồn tại không
   - User đã có subscription active chưa
4. Nếu thành công:
   - Tạo subscription với status ACTIVE
   - expires_at = started_at + 30 ngày
   - Alert "Đăng ký thành công!"
   - Refresh danh sách subscriptions

**Test cases:**
- ✅ Đăng ký gói mới → Thành công, subscription xuất hiện
- ✅ Đăng ký khi đã có subscription active → Lỗi "User already has an active subscription"
- ✅ Đăng ký gói không tồn tại → Lỗi "Plan not found"

---

### 4.3 Xem lịch sử subscriptions
**Luồng hoạt động:**
1. Tự động gọi `GET /subscriptions` khi vào trang
2. Hiển thị danh sách subscriptions với:
   - ID
   - Status (ACTIVE, CANCELLED, EXPIRED)
   - Plan ID
   - Ngày bắt đầu
   - Ngày hết hạn
   - Nút "Hủy" (chỉ hiện khi status = ACTIVE)

**Test cases:**
- ✅ Hiển thị tất cả subscriptions của user
- ✅ Empty state khi chưa có subscription nào

---

### 4.4 Hủy subscription
**Luồng hoạt động:**
1. Click nút "Hủy" trên subscription card (chỉ hiện khi ACTIVE)
2. Confirm dialog: "Bạn có chắc muốn hủy subscription này?"
3. Nếu confirm → Gọi `POST /subscriptions/{sub_id}/cancel`
4. Backend cập nhật:
   - status = "CANCELLED"
   - auto_renew = 0
5. Alert "Đã hủy subscription"
6. Refresh danh sách

**Test cases:**
- ✅ Hủy subscription thành công → Status chuyển thành CANCELLED
- ✅ Cancel confirm → Không hủy

---

## 💳 5. THANH TOÁN (Payments)

**Trang:** `/app/payments`

### 5.1 Xem số dư
**Luồng hoạt động:**
1. Tự động gọi `GET /me` khi vào trang
2. Hiển thị balance card với:
   - Số dư hiện tại (VND)
   - Điểm tích lũy

**Test cases:**
- ✅ Hiển thị đúng số dư và điểm

---

### 5.2 Tạo thanh toán
**Luồng hoạt động:**
1. Click nút "💳 Tạo thanh toán"
2. Modal form hiện ra với:
   - Số tiền (VND, required, min 1000, step 1000)
   - Phương thức thanh toán (dropdown):
     - Chuyển khoản ngân hàng
     - Thẻ tín dụng
     - Ví điện tử
   - Mô tả (optional)
3. Submit → Gọi `POST /payments`
4. Tạo payment với status PENDING
5. Đóng modal, refresh danh sách payments

**Test cases:**
- ✅ Tạo payment thành công → Payment xuất hiện với status PENDING
- ✅ Tạo payment với số tiền < 1000 → Validation error

---

### 5.3 Xác nhận thanh toán
**Luồng hoạt động:**
1. Trong danh sách payments, payment có status PENDING sẽ có nút "Xác nhận"
2. Click "Xác nhận" → Gọi `POST /payments/{payment_id}/confirm`
3. Backend:
   - Cập nhật payment status = COMPLETED
   - Cộng `amount_cents` vào `user.balance_cents`
   - Nếu có subscription_id → Cập nhật subscription status = ACTIVE
4. Alert "Xác nhận thanh toán thành công!"
5. Refresh danh sách và user info

**Test cases:**
- ✅ Xác nhận payment → Status chuyển thành COMPLETED, số dư tăng
- ✅ Xác nhận payment cho subscription → Subscription được activate

---

### 5.4 Xem lịch sử thanh toán
**Luồng hoạt động:**
1. Tự động gọi `GET /payments` khi vào trang
2. Hiển thị table với:
   - ID
   - Số tiền
   - Phương thức
   - Trạng thái (badge màu)
   - Ngày tạo
   - Nút "Xác nhận" (chỉ hiện khi PENDING)

**Test cases:**
- ✅ Hiển thị tất cả payments của user
- ✅ Empty state khi chưa có payment nào
- ✅ Payments được sắp xếp mới nhất trước

---

## 📊 6. THỐNG KÊ & SỬ DỤNG

**Trang:** `/app/usage`

### 6.1 Xem thống kê tổng quan
**Luồng hoạt động:**
1. Tự động gọi `GET /usage/stats` khi vào trang
2. Hiển thị 4 stat cards lớn:
   - 🗄️ Tổng số Database (active/total)
   - 💾 Tổng dung lượng (đã dùng/total, tự động convert GB nếu >= 1024MB)
   - 💳 Tổng chi tiêu (VND)
   - 📦 Gói đang dùng

**Test cases:**
- ✅ Hiển thị đúng thống kê tổng hợp
- ✅ Convert MB → GB đúng khi >= 1024MB

---

### 6.2 Xem hóa đơn
**Luồng hoạt động:**
1. Tự động gọi `GET /invoices` khi vào trang
2. Hiển thị table với:
   - ID
   - Số tiền
   - Kỳ hạn (period_start - period_end)
   - Trạng thái
   - Ngày tạo

**Test cases:**
- ✅ Hiển thị invoices từ payments có subscription_id
- ✅ Empty state khi chưa có invoice nào

---

## 👤 7. QUẢN LÝ TÀI KHOẢN (Profile)

**Trang:** `/app/profile`

### 7.1 Xem thông tin cá nhân
**Luồng hoạt động:**
1. Tự động gọi `GET /me` khi vào trang
2. Hiển thị:
   - Email (có thể edit)
   - ID (read-only)

**Test cases:**
- ✅ Hiển thị đúng email và ID của user

---

### 7.2 Cập nhật profile
**Luồng hoạt động:**
1. Sửa email trong form
2. Click "Cập nhật thông tin"
3. Gọi `PUT /me` với email mới
4. Backend kiểm tra email đã tồn tại chưa
5. Nếu thành công → Cập nhật email, hiển thị success message
6. Nếu thất bại → Hiển thị error

**Test cases:**
- ✅ Cập nhật email thành công → Email mới được lưu
- ✅ Cập nhật với email đã tồn tại → Lỗi "Email already exists"
- ✅ Cập nhật với email không hợp lệ → Validation error

---

### 7.3 Xem thông tin tài chính
**Luồng hoạt động:**
1. Hiển thị:
   - Số dư (VND)
   - Điểm tích lũy
   - Link "Quản lý thanh toán" → Chuyển đến `/app/payments`

**Test cases:**
- ✅ Hiển thị đúng số dư và điểm
- ✅ Click link → Chuyển đến trang Payments

---

### 7.4 Đổi mật khẩu
**Luồng hoạt động:**
1. Click nút "Đổi mật khẩu"
2. Form hiện ra với:
   - Mật khẩu cũ (required)
   - Mật khẩu mới (required, min 6 ký tự)
   - Xác nhận mật khẩu mới (required)
3. Submit → Gọi `POST /me/change-password`
4. Backend kiểm tra:
   - Mật khẩu cũ có đúng không
5. Nếu thành công → Cập nhật password, hiển thị success, đóng form
6. Nếu thất bại → Hiển thị error

**Test cases:**
- ✅ Đổi mật khẩu thành công → Có thể đăng nhập với mật khẩu mới
- ✅ Đổi với mật khẩu cũ sai → Lỗi "Old password incorrect"
- ✅ Đổi với mật khẩu mới < 6 ký tự → Validation error
- ✅ Đổi với mật khẩu mới không khớp → Error "Mật khẩu mới không khớp"

---

## 🎨 8. UI/UX FEATURES

### 8.1 Sidebar Navigation
- Sidebar cố định bên trái với gradient header
- 6 menu items với icons
- Active state với gradient background và indicator
- Hover effects với smooth transitions
- Logout button ở footer

### 8.2 Responsive Design
- Desktop-first design
- Grid layouts tự động điều chỉnh
- Modal forms với backdrop blur
- Loading states
- Error states với alerts
- Empty states với icons và messages

### 8.3 Visual Effects
- Gradient backgrounds
- Smooth animations và transitions
- Hover effects trên cards và buttons
- Shadow layers cho depth
- Color-coded status badges

---

## 🔄 LUỒNG HOẠT ĐỘNG TỔNG QUAN

### Luồng đăng ký và sử dụng lần đầu:
1. **Đăng ký** → Tạo tài khoản mới
2. **Đăng nhập** → Nhận JWT token
3. **Dashboard** → Xem tổng quan (số dư = 0, chưa có DB)
4. **Nạp tiền** → Tạo payment → Xác nhận → Số dư tăng
5. **Đăng ký gói** → Chọn plan → Subscribe
6. **Tạo Database** → Nhập thông tin → Database được tạo trên MySQL
7. **Xem Connection Info** → Copy thông tin để kết nối
8. **Sử dụng Database** → Kết nối với MySQL bằng thông tin đã copy

### Luồng quản lý database:
1. **Tạo Database** → Status PENDING → Provisioning → Status ACTIVE
2. **Xem Stats** → Tự động load khi card render
3. **Reset Password** → Xóa user cũ → Tạo lại với password mới
4. **Xóa Database** → Xóa DB vật lý → Status DELETED

### Luồng thanh toán:
1. **Tạo Payment** → Status PENDING
2. **Xác nhận Payment** → Status COMPLETED → Số dư tăng
3. **Nếu có subscription_id** → Subscription được activate

---

## ✅ CHECKLIST TEST

### Authentication
- [ ] Đăng ký tài khoản mới
- [ ] Đăng nhập với thông tin đúng
- [ ] Đăng nhập với thông tin sai
- [ ] Đăng xuất

### Dashboard
- [ ] Xem được stat cards
- [ ] Click Quick Actions chuyển đúng trang
- [ ] Dữ liệu được load đúng

### Database Management
- [ ] Tạo database mới
- [ ] Xem danh sách databases
- [ ] Xem connection info và copy
- [ ] Reset password database
- [ ] Xem stats với progress bar
- [ ] Xóa database

### Subscriptions
- [ ] Xem bảng giá
- [ ] Đăng ký gói mới
- [ ] Xem lịch sử subscriptions
- [ ] Hủy subscription

### Payments
- [ ] Xem số dư
- [ ] Tạo payment mới
- [ ] Xác nhận payment
- [ ] Xem lịch sử payments

### Usage & Statistics
- [ ] Xem thống kê tổng quan
- [ ] Xem hóa đơn

### Profile
- [ ] Xem thông tin cá nhân
- [ ] Cập nhật email
- [ ] Đổi mật khẩu

---

## 🐛 CÁC LỖI CẦN LƯU Ý KHI TEST

1. **Database Migration**: Đảm bảo backend đã restart để migration chạy (thêm cột `db_username`, `db_password_hash`)
2. **MySQL Connection**: Đảm bảo MySQL container đang chạy (`docker-compose up -d`)
3. **JWT Token**: Token hết hạn sau 60 phút, cần đăng nhập lại
4. **Empty States**: Nhiều trang có empty state khi chưa có dữ liệu
5. **Mock Data**: Database stats sử dụng random data (10-80% của quota)

---

## 📝 NOTES

- Tất cả API calls đều có error handling
- Loading states được hiển thị khi đang fetch data
- Success/Error messages được hiển thị qua alerts hoặc inline messages
- Form validation ở cả client và server side
- Responsive design tối ưu cho desktop (chưa optimize mobile)

