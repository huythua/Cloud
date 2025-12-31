# Báo Cáo Test Trang Database Detail
**Ngày test:** $(date)
**Tester:** Automated Test Script
**Môi trường:** Development (Docker Compose)

---

## 📋 Tổng Quan Test

### Mục tiêu
Kiểm tra toàn bộ tính năng trên trang Database Detail bao gồm:
- Tab Overview
- Tab SQL Query  
- Tab Backup & Restore
- Tab Monitoring
- Tab Clone
- Tab Export/Import

---

## ✅ Kết Quả Test Chi Tiết

### 1. 📊 Tab Overview

#### 1.1 Database Information Card
- [ ] **Status hiển thị đúng**
  - ACTIVE: badge màu xanh
  - PENDING: badge màu đỏ
  - FAILED: badge màu đỏ
  
- [ ] **Hostname hiển thị đúng**
  - Hiển thị hostname từ database object
  - Nếu null → "N/A"
  
- [ ] **Port hiển thị đúng**
  - Hiển thị port từ database object
  - Nếu null → "N/A"
  
- [ ] **Quota hiển thị đúng**
  - Có quota: "{quota_mb} MB"
  - Không có quota: "Unlimited"

#### 1.2 Quick Actions Card
- [ ] **Button "Run SQL Query"**
  - Click → Chuyển sang tab SQL Query
  - activeTab === 'sql'
  
- [ ] **Button "Backup & Restore"**
  - Click → Chuyển sang tab Backup
  - activeTab === 'backup'
  
- [ ] **Button "View Monitoring"**
  - Click → Chuyển sang tab Monitoring
  - activeTab === 'monitoring'

#### 1.3 Connection & Security Card
- [ ] **ConnectionInfo Component**
  - Hiển thị connection string
  - Copy button hoạt động
  - Hiển thị đầy đủ thông tin: hostname, port, database name, username
  
- [ ] **ResetPassword Component**
  - Form hiển thị đúng
  - Reset password thành công
  - Error handling đúng

**Kết quả:** ⏳ Đang test...

---

### 2. 💻 Tab SQL Query

#### 2.1 SELECT Query
- [ ] **Query cơ bản**
  ```sql
  SELECT * FROM information_schema.tables WHERE table_schema = DATABASE();
  ```
  - Kết quả hiển thị trong bảng
  - Columns và rows đúng
  - Execution time hiển thị
  
- [ ] **Query với WHERE**
  ```sql
  SELECT table_name FROM information_schema.tables LIMIT 5;
  ```
  - Kết quả đúng

#### 2.2 INSERT Query
- [ ] **Tạo table và insert**
  ```sql
  CREATE TABLE IF NOT EXISTS test_table (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100));
  INSERT INTO test_table (name) VALUES ('Test 1');
  ```
  - Table được tạo thành công
  - Insert thành công
  - Message hiển thị "Rows affected: 1"
  - Warning về UNIQUE constraint nếu table không có constraint

#### 2.3 INSERT Duplicate (Security Test)
- [ ] **Insert duplicate lần 1**
  ```sql
  INSERT INTO test_table (name) VALUES ('Test 1');
  ```
  - Thành công
  
- [ ] **Insert duplicate lần 2**
  ```sql
  INSERT INTO test_table (name) VALUES ('Test 1');
  ```
  - Nếu có UNIQUE constraint → Error "Duplicate entry detected"
  - Nếu không có UNIQUE constraint → Warning "⚠️ Note: This table has no UNIQUE constraint"

#### 2.4 UPDATE Query
- [ ] **Update data**
  ```sql
  UPDATE test_table SET name = 'Updated Test' WHERE id = 1;
  ```
  - Update thành công
  - Message "Rows affected: 1"

#### 2.5 DELETE Query
- [ ] **Delete data**
  ```sql
  DELETE FROM test_table WHERE id = 1;
  ```
  - Delete thành công
  - Message "Rows affected: 1"

#### 2.6 Security Checks
- [ ] **DROP DATABASE bị chặn**
  ```sql
  DROP DATABASE test_db;
  ```
  - Error: "Operation 'DROP DATABASE' is not allowed"
  
- [ ] **CREATE DATABASE bị chặn**
  ```sql
  CREATE DATABASE test_db;
  ```
  - Error: "Operation 'CREATE DATABASE' is not allowed"
  
- [ ] **Multiple statements bị chặn**
  ```sql
  SELECT 1; SELECT 2;
  ```
  - Error: "Multiple statements are not allowed"

#### 2.7 SQL Execution Security
- [ ] **SQL chạy với user của DB (không phải root)**
  - Kiểm tra logs backend
  - Connection sử dụng `db_username` và `db_password_hash`

**Kết quả:** ⏳ Đang test...

---

### 3. 💾 Tab Backup & Restore

#### 3.1 Create Backup
- [ ] **Tạo backup thành công**
  - Nhập tên: "backup_test_1"
  - Nhập mô tả: "Test backup"
  - Click "Create Backup"
  - Status: COMPLETED
  - Backup xuất hiện trong danh sách

#### 3.2 List Backups
- [ ] **Danh sách backup hiển thị đúng**
  - Name, Description, Status, Created At, Size
  - Status badges: COMPLETED (xanh), FAILED (đỏ)
  - Sắp xếp theo thời gian (mới nhất trước)

#### 3.3 Download Backup
- [ ] **Download backup file**
  - Click "Download" trên backup
  - File .sql được tải xuống
  - File có thể mở được
  - File chứa đầy đủ schema và data

#### 3.4 Delete Backup
- [ ] **Xóa backup**
  - Click "Delete"
  - Confirm dialog hiển thị
  - Backup bị xóa khỏi danh sách

#### 3.5 Restore Database
- [ ] **Restore từ backup**
  - Chọn backup từ danh sách
  - Click "Restore Database"
  - Confirm dialog hiển thị
  - Status: IN_PROGRESS → COMPLETED
  - Database được restore thành công

#### 3.6 Component Rendering
- [ ] **Không render như modal**
  - Không có overlay
  - Không có close button ở header
  - Render như component bình thường

**Kết quả:** ⏳ Đang test...

---

### 4. 📈 Tab Monitoring

#### 4.1 Initial Metrics (Sau khi tạo DB)
- [ ] **QUAN TRỌNG: Có metrics ngay sau khi tạo DB**
  - Không hiển thị "Chưa có dữ liệu metrics"
  - Có ít nhất 3 metrics: CONNECTIONS, QUERIES, MEMORY
  - Mỗi metric có ít nhất 1 data point

#### 4.2 Overview Tab
- [ ] **Performance Summary Cards**
  - QPS (Queries Per Second)
  - Avg Response Time (ms)
  - Active Connections
  - Memory Usage (MB)
  - Slow Queries Count

- [ ] **Real-time Metrics Charts**
  - CONNECTIONS chart hiển thị
  - QUERIES chart hiển thị
  - MEMORY chart hiển thị

- [ ] **Timeframe Selector**
  - 1h, 6h, 24h, 7d hoạt động
  - Data được filter theo timeframe

- [ ] **Auto-refresh**
  - Metrics được cập nhật mỗi 5 giây
  - Không có flickering

#### 4.3 Metrics After SQL Queries
- [ ] **Metrics được cập nhật sau SQL queries**
  - Chạy SQL queries trong tab SQL Query
  - Quay lại tab Monitoring
  - QUERIES metric tăng
  - CONNECTIONS metric có thể tăng
  - MEMORY metric có thể tăng

#### 4.4 Connections Tab
- [ ] **Danh sách connections**
  - ID, User, Host, DB, Command, Time, State
  - Active connections count đúng
  - Max connections đúng

#### 4.5 Slow Queries Tab
- [ ] **Danh sách slow queries**
  - Query text, Duration (ms), Rows examined/sent, Timestamp
  - Nếu không có → Message phù hợp

#### 4.6 Historical Metrics Table
- [ ] **Bảng Historical Metrics**
  - Giá trị hiện tại hiển thị đúng
  - Thấp nhất (Min) hiển thị đúng
  - Trung bình (Avg) hiển thị đúng
  - Cao nhất (Max) hiển thị đúng
  - Số lần đo hiển thị đúng
  - Format số đúng (không có dấu phẩy lẫn lộn)
  - Tooltip hoạt động khi hover

#### 4.7 Component Rendering
- [ ] **Không render như modal**
  - Không có overlay
  - Render như component bình thường

**Kết quả:** ⏳ Đang test...

---

### 5. 📋 Tab Clone

#### 5.1 Clone Database
- [ ] **Clone thành công**
  - Source Database name hiển thị đúng
  - Nhập tên: "cloned_db_1"
  - Nhập mô tả: "Cloned database"
  - Click "Clone Database"
  - Clone process bắt đầu
  - Database mới: PENDING → ACTIVE
  - Database mới có cùng data với database gốc
  - Database mới xuất hiện trong danh sách

#### 5.2 Clone với tên trùng
- [ ] **Error khi tên trùng**
  - Nhập tên database đã tồn tại
  - Error: "Database name already exists"

#### 5.3 Component Rendering
- [ ] **Không render như modal**
  - Không có overlay
  - Render như component bình thường

**Kết quả:** ⏳ Đang test...

---

### 6. 📤📥 Tab Export/Import

#### 6.1 Export Database
- [ ] **Export thành công**
  - Click "Export Database"
  - File SQL được tải xuống
  - File tên: `{database_name}_export_{timestamp}.sql`
  - File có thể mở được
  - File chứa đầy đủ schema và data

#### 6.2 Import Database
- [ ] **Import thành công**
  - Click "Chọn file SQL"
  - Chọn file .sql đã export
  - Click "Import Database"
  - Import process bắt đầu
  - Database được import thành công
  - Data khớp với file SQL

#### 6.3 Import với file không hợp lệ
- [ ] **Error khi file không hợp lệ**
  - Chọn file không phải .sql
  - Error: "Invalid file type. Please select a .sql file"

#### 6.4 Component Rendering
- [ ] **Không render như modal**
  - Không có overlay
  - Render như component bình thường

**Kết quả:** ⏳ Đang test...

---

### 7. 🔍 Navigation & UI

#### 7.1 Tab Navigation
- [ ] **Chuyển đổi tab**
  - Click tab → Tab được chuyển đúng
  - Active tab có border-bottom màu xanh (#3b82f6)
  - Tab icon hiển thị đúng
  - Tab label hiển thị đúng

#### 7.2 Header
- [ ] **Back button**
  - Click ← → Quay lại /app/databases
  
- [ ] **Database name**
  - Hiển thị đúng tên database
  
- [ ] **Status badge**
  - ACTIVE: màu xanh (#d1fae5 background, #065f46 text)
  - PENDING/FAILED: màu đỏ (#fee2e2 background, #991b1b text)
  
- [ ] **Database ID và Created date**
  - Hiển thị đúng format

#### 7.3 Database Status Handling
- [ ] **Database không ACTIVE**
  - Tất cả tabs (trừ Overview) hiển thị:
    "Database is {status}. Please wait for it to become ACTIVE before using features."
  - Overview tab vẫn hoạt động bình thường

- [ ] **Database ACTIVE**
  - Tất cả tabs hoạt động bình thường

**Kết quả:** ⏳ Đang test...

---

## 🔍 Kiểm Tra Code Logic

### Component Structure
- [x] DatabaseDetail.jsx có đầy đủ tabs
- [x] Mỗi component được import đúng
- [x] Props được truyền đúng
- [x] Conditional rendering đúng

### API Integration
- [x] Tất cả API endpoints tồn tại trong main.py
- [x] Frontend gọi API đúng endpoint
- [x] Headers Authorization được gửi đúng

### Security
- [x] SQL execution sử dụng user của DB
- [x] Dangerous operations bị chặn
- [x] Multiple statements bị chặn

---

## 📊 Tổng Kết

### Tổng số test cases: 0
### Đã pass: 0
### Đã fail: 0
### Đang chờ: 0

### Các vấn đề phát hiện:
- Chưa có

### Ghi chú:
- Test được thực hiện trên môi trường development
- Cần test thực tế trên UI để xác nhận kết quả

---

## 🎯 Bước Tiếp Theo

1. ✅ Hoàn thành test plan
2. ⏳ Thực hiện test thực tế trên UI
3. ⏳ Ghi lại kết quả chi tiết
4. ⏳ Fix các bugs nếu có
5. ⏳ Retest các tính năng đã fix

