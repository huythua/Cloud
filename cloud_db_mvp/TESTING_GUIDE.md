# Hướng Dẫn Test Các Tính Năng Mới

## 🎯 Tổng Quan

Sau khi đăng nhập vào hệ thống CloudDB, bạn sẽ thấy Dashboard với các trang chính:
- **Dashboard**: Tổng quan hệ thống
- **Databases**: Quản lý databases
- **Payments**: Thanh toán
- **Subscriptions**: Gói đăng ký
- **Usage**: Thống kê sử dụng
- **Profile**: Thông tin cá nhân

## 📋 Các Tính Năng Mới Cần Test

### 1. 💾 Backup & Restore Database

**Vị trí:** Trang **Databases** → Click button **💾** trên database card

**Cách test:**
1. Vào trang **Databases**
2. Tìm một database có trạng thái **ACTIVE** (màu xanh)
3. Click button **💾** (Backup & Restore)
4. Modal sẽ hiển thị với các tab:
   - **Create Backup:**
     - Nhập tên backup (ví dụ: "backup_test_1")
     - Nhập mô tả (tùy chọn)
     - Click **💾 Tạo Backup**
     - Đợi vài giây, backup sẽ được tạo
   - **Backup List:**
     - Xem danh sách các backup đã tạo
     - Click **⬇️ Download** để tải backup file
     - Click **🗑️ Xóa** để xóa backup
   - **Restore:**
     - Chọn một backup từ danh sách
     - Click **🔄 Restore Database**
     - Đợi vài phút, restore sẽ hoàn thành
     - Xem trạng thái restore trong status card

**Kết quả mong đợi:**
- ✅ Backup được tạo thành công với status COMPLETED
- ✅ Có thể download backup file (.sql)
- ✅ Restore hoạt động và database được khôi phục

---

### 2. 📊 Monitoring & Performance Metrics

**Vị trí:** Trang **Databases** → Click button **📊** trên database card

**Cách test:**
1. Vào trang **Databases**
2. Tìm một database có trạng thái **ACTIVE**
3. Click button **📊** (Monitoring)
4. Modal sẽ hiển thị với các tab:
   - **Overview:**
     - Xem performance summary cards (QPS, Response Time, Connections, etc.)
     - Xem real-time metrics với charts
     - Chọn timeframe: 1h, 6h, 24h, 7d
     - Bật/tắt auto-refresh
   - **Connections:**
     - Xem danh sách active connections
     - Thông tin: User, Host, Database, State, Time
   - **Slow Queries:**
     - Xem danh sách slow queries
     - Thông tin: Query text, Duration, Rows examined/sent

**Kết quả mong đợi:**
- ✅ Hiển thị metrics và charts
- ✅ Real-time data được cập nhật
- ✅ Connections và slow queries được hiển thị

---

### 3. 📋 Clone Database

**Vị trí:** Trang **Databases** → Click button **📋** trên database card

**Cách test:**
1. Vào trang **Databases**
2. Tìm một database có trạng thái **ACTIVE**
3. Click button **📋** (Clone Database)
4. Modal sẽ hiển thị:
   - Source Database: Tên database gốc
   - Nhập tên database mới (ví dụ: "cloned_db_1")
   - Nhập mô tả (tùy chọn)
   - Click **📋 Clone Database**
   - Đợi vài phút, clone sẽ hoàn thành

**Kết quả mong đợi:**
- ✅ Database mới được tạo với tên đã nhập
- ✅ Database mới có cùng data với database gốc
- ✅ Database mới xuất hiện trong danh sách databases

---

### 4. 📤📥 Export/Import Database

**Vị trí:** Trang **Databases** → Click button **📤📥** trên database card

**Cách test:**

#### Export Database:
1. Vào trang **Databases**
2. Tìm một database có trạng thái **ACTIVE**
3. Click button **📤📥** (Export/Import)
4. Chọn tab **📤 Export**
5. Click **📤 Export Database**
6. File SQL sẽ được tải xuống tự động

#### Import Database:
1. Vào trang **Databases**
2. Tìm một database có trạng thái **ACTIVE**
3. Click button **📤📥** (Export/Import)
4. Chọn tab **📥 Import**
5. Click **Chọn file SQL** và chọn file .sql đã export trước đó
6. Click **📥 Import Database**
7. Đợi vài phút, import sẽ hoàn thành

**Kết quả mong đợi:**
- ✅ Export: File SQL được tải xuống thành công
- ✅ Import: Database được import thành công với data từ file

---

## 🔍 Kiểm Tra Trạng Thái

### Kiểm tra Database Status:
- **ACTIVE** (màu xanh): Database đang hoạt động, có thể sử dụng tất cả tính năng
- **PENDING** (màu vàng): Database đang được tạo
- **FAILED** (màu đỏ): Database tạo thất bại

### Kiểm tra Backup/Restore Status:
- **PENDING**: Đang chờ xử lý
- **IN_PROGRESS**: Đang thực hiện
- **COMPLETED**: Hoàn thành thành công
- **FAILED**: Thất bại (xem error_message để biết lý do)

---

## ⚠️ Lưu Ý Khi Test

1. **Database phải ACTIVE:** Tất cả tính năng chỉ hoạt động với database có trạng thái ACTIVE
2. **Thời gian chờ:** 
   - Backup: 10-30 giây
   - Restore: 1-5 phút (tùy kích thước database)
   - Clone: 2-10 phút (tùy kích thước database)
   - Import: 1-5 phút (tùy kích thước file)
3. **File size:** 
   - Export/Import: File lớn có thể mất nhiều thời gian
   - Nên test với database nhỏ trước
4. **Error handling:** 
   - Nếu có lỗi, xem thông báo lỗi trong ErrorMessage (màu đỏ)
   - Kiểm tra logs backend nếu cần: `docker compose logs backend`

---

## 🐛 Troubleshooting

### Backup/Restore không hoạt động:
- Kiểm tra database có ACTIVE không
- Kiểm tra logs: `docker compose logs backend | grep -i backup`
- Kiểm tra MySQL service: `docker compose ps mysql`

### Clone không hoạt động:
- Kiểm tra source database có ACTIVE không
- Kiểm tra có đủ quota không
- Xem logs: `docker compose logs backend | grep -i clone`

### Export/Import không hoạt động:
- Kiểm tra file .sql có hợp lệ không
- Kiểm tra database có ACTIVE không
- Xem logs: `docker compose logs backend | grep -i import`

### Monitoring không hiển thị data:
- Database phải có hoạt động (queries, connections)
- Kiểm tra MySQL performance_schema đã bật chưa
- Xem logs: `docker compose logs backend | grep -i monitoring`

---

## 📝 Checklist Test

- [ ] Backup: Tạo backup thành công
- [ ] Backup: Download backup file
- [ ] Backup: Xóa backup
- [ ] Restore: Restore từ backup thành công
- [ ] Monitoring: Xem Overview metrics
- [ ] Monitoring: Xem Connections
- [ ] Monitoring: Xem Slow Queries
- [ ] Clone: Clone database thành công
- [ ] Clone: Database mới có data giống database gốc
- [ ] Export: Export database thành công
- [ ] Import: Import database thành công

---

## 🎉 Hoàn Thành

Sau khi test xong tất cả tính năng, bạn sẽ có:
- ✅ Backup & Restore hoạt động tốt
- ✅ Monitoring hiển thị metrics chính xác
- ✅ Clone tạo database mới thành công
- ✅ Export/Import hoạt động đúng

Nếu có vấn đề, hãy kiểm tra logs và thông báo lỗi để debug!
