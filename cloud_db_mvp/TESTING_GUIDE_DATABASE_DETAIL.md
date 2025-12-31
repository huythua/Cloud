# Kế Hoạch Test Trang Chi Tiết Database (DatabaseDetail)

## 🎯 Tổng Quan

Trang **Database Detail** (`/app/databases/:id`) là trang quản lý chi tiết cho từng database, tập trung tất cả các tính năng vào một nơi với tab navigation.

## 📋 Các Tab và Tính Năng Cần Test

### 1. 📊 Tab Overview

**Mục đích:** Hiển thị thông tin tổng quan về database và quick actions

**Cách test:**
1. Vào trang **Databases**
2. Click button **"View Details"** trên một database card
3. Kiểm tra tab **Overview** (mặc định được chọn)

**Kiểm tra:**
- ✅ **Database Information Card:**
  - Status hiển thị đúng (ACTIVE/PENDING/FAILED)
  - Hostname hiển thị đúng
  - Port hiển thị đúng
  - Quota hiển thị đúng (MB hoặc Unlimited)
  
- ✅ **Quick Actions Card:**
  - Button "Run SQL Query" → Click và kiểm tra chuyển sang tab SQL
  - Button "Backup & Restore" → Click và kiểm tra chuyển sang tab Backup
  - Button "View Monitoring" → Click và kiểm tra chuyển sang tab Monitoring

- ✅ **Connection & Security Card:**
  - Component `ConnectionInfo` hiển thị đúng
  - Component `ResetPassword` hiển thị đúng
  - Có thể copy connection string
  - Có thể reset password

**Kết quả mong đợi:**
- ✅ Tất cả thông tin hiển thị chính xác
- ✅ Quick actions chuyển tab đúng
- ✅ Connection info và reset password hoạt động

---

### 2. 💻 Tab SQL Query

**Mục đích:** Cho phép chạy SQL queries trực tiếp trên database

**Cách test:**
1. Vào Database Detail → Tab **SQL Query**
2. Kiểm tra SQL Query Executor component

**Test Cases:**

#### Test Case 2.1: SELECT Query
```sql
SELECT * FROM information_schema.tables WHERE table_schema = DATABASE();
```
- ✅ Nhập query vào textarea
- ✅ Click "Execute Query"
- ✅ Kết quả hiển thị trong bảng
- ✅ Columns và rows hiển thị đúng
- ✅ Execution time hiển thị

#### Test Case 2.2: INSERT Query
```sql
CREATE TABLE IF NOT EXISTS test_table (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100));
INSERT INTO test_table (name) VALUES ('Test 1');
```
- ✅ Tạo table thành công
- ✅ Insert data thành công
- ✅ Message hiển thị số rows affected
- ✅ Warning về UNIQUE constraint nếu table không có constraint

#### Test Case 2.3: INSERT Duplicate (Test Warning)
```sql
INSERT INTO test_table (name) VALUES ('Test 1');
INSERT INTO test_table (name) VALUES ('Test 1');
```
- ✅ Lần 1: Insert thành công
- ✅ Lần 2: 
  - Nếu table có UNIQUE constraint → Error "Duplicate entry detected"
  - Nếu table không có UNIQUE constraint → Warning "⚠️ Note: This table has no UNIQUE constraint, so duplicate data can be inserted."

#### Test Case 2.4: UPDATE Query
```sql
UPDATE test_table SET name = 'Updated Test' WHERE id = 1;
```
- ✅ Update thành công
- ✅ Message hiển thị số rows affected

#### Test Case 2.5: DELETE Query
```sql
DELETE FROM test_table WHERE id = 1;
```
- ✅ Delete thành công
- ✅ Message hiển thị số rows affected

#### Test Case 2.6: DANGEROUS Operations (Should be blocked)
```sql
DROP DATABASE test_db;
CREATE DATABASE test_db;
DROP SCHEMA test_db;
```
- ✅ Error: "Operation 'DROP DATABASE' is not allowed for security reasons"
- ✅ Error: "Operation 'CREATE DATABASE' is not allowed for security reasons"

#### Test Case 2.7: Multiple Statements (Should be blocked)
```sql
SELECT 1; SELECT 2; SELECT 3;
```
- ✅ Error: "Multiple statements are not allowed for security reasons"

**Kết quả mong đợi:**
- ✅ SELECT queries hiển thị kết quả đúng
- ✅ INSERT/UPDATE/DELETE queries thực thi thành công
- ✅ Warning về duplicate data khi cần
- ✅ Dangerous operations bị chặn
- ✅ Multiple statements bị chặn
- ✅ SQL execution sử dụng user của database đó (không phải root/admin)

---

### 3. 💾 Tab Backup & Restore

**Mục đích:** Quản lý backup và restore database

**Cách test:**
1. Vào Database Detail → Tab **Backup & Restore**
2. Kiểm tra BackupManager component

**Test Cases:**

#### Test Case 3.1: Create Backup
- ✅ Nhập tên backup (ví dụ: "backup_test_1")
- ✅ Nhập mô tả (tùy chọn)
- ✅ Click "Create Backup"
- ✅ Backup được tạo với status COMPLETED
- ✅ Backup xuất hiện trong danh sách

#### Test Case 3.2: List Backups
- ✅ Danh sách backup hiển thị đúng
- ✅ Thông tin: Name, Description, Status, Created At, Size
- ✅ Status badges hiển thị đúng màu (COMPLETED = xanh, FAILED = đỏ)

#### Test Case 3.3: Download Backup
- ✅ Click "Download" trên một backup
- ✅ File .sql được tải xuống
- ✅ File có thể mở và xem được

#### Test Case 3.4: Delete Backup
- ✅ Click "Delete" trên một backup
- ✅ Confirm dialog hiển thị
- ✅ Backup bị xóa khỏi danh sách

#### Test Case 3.5: Restore Database
- ✅ Chọn một backup từ danh sách
- ✅ Click "Restore Database"
- ✅ Confirm dialog hiển thị
- ✅ Restore process bắt đầu
- ✅ Status hiển thị IN_PROGRESS → COMPLETED
- ✅ Database được restore thành công

**Kết quả mong đợi:**
- ✅ Tạo backup thành công
- ✅ Download backup file thành công
- ✅ Xóa backup thành công
- ✅ Restore database thành công
- ✅ Component không render như modal (không có overlay)

---

### 4. 📈 Tab Monitoring

**Mục đích:** Hiển thị performance metrics và monitoring data

**Cách test:**
1. Vào Database Detail → Tab **Monitoring**
2. Kiểm tra DatabaseMonitoring component

**Test Cases:**

#### Test Case 4.1: Initial Metrics (Sau khi tạo DB)
- ✅ **QUAN TRỌNG:** Ngay sau khi tạo DB, phải có metrics data
- ✅ Không hiển thị "Chưa có dữ liệu metrics"
- ✅ Có ít nhất 3 metrics: CONNECTIONS, QUERIES, MEMORY
- ✅ Mỗi metric có ít nhất 1 data point với timestamp

#### Test Case 4.2: Overview Tab
- ✅ Performance Summary Cards hiển thị:
  - QPS (Queries Per Second)
  - Avg Response Time (ms)
  - Active Connections
  - Memory Usage (MB)
  - Slow Queries Count
- ✅ Real-time Metrics Charts hiển thị:
  - CONNECTIONS chart
  - QUERIES chart
  - MEMORY chart
- ✅ Timeframe selector hoạt động (1h, 6h, 24h, 7d)
- ✅ Auto-refresh hoạt động (mỗi 5 giây)

#### Test Case 4.3: Metrics After SQL Queries
1. Chạy một số SQL queries trong tab SQL Query
2. Quay lại tab Monitoring
- ✅ Metrics được cập nhật
- ✅ QUERIES metric tăng
- ✅ CONNECTIONS metric có thể tăng
- ✅ MEMORY metric có thể tăng (nếu có data mới)

#### Test Case 4.4: Connections Tab
- ✅ Danh sách connections hiển thị
- ✅ Thông tin: ID, User, Host, DB, Command, Time, State
- ✅ Active connections count hiển thị đúng
- ✅ Max connections hiển thị đúng

#### Test Case 4.5: Slow Queries Tab
- ✅ Danh sách slow queries hiển thị (nếu có)
- ✅ Thông tin: Query text, Duration (ms), Rows examined/sent, Timestamp
- ✅ Nếu không có slow queries, hiển thị message phù hợp

**Kết quả mong đợi:**
- ✅ **QUAN TRỌNG:** Luôn có metrics data ngay sau khi DB được tạo
- ✅ Metrics được collect tự động sau mỗi SQL query
- ✅ Real-time metrics được cập nhật mỗi 5 giây
- ✅ Charts hiển thị data đúng
- ✅ Connections và slow queries hiển thị đúng
- ✅ Component không render như modal (không có overlay)

---

### 5. 📋 Tab Clone

**Mục đích:** Clone database sang database mới

**Cách test:**
1. Vào Database Detail → Tab **Clone**
2. Kiểm tra CloneDatabase component

**Test Cases:**

#### Test Case 5.1: Clone Database
- ✅ Source Database name hiển thị đúng
- ✅ Nhập tên database mới (ví dụ: "cloned_db_1")
- ✅ Nhập mô tả (tùy chọn)
- ✅ Click "Clone Database"
- ✅ Clone process bắt đầu
- ✅ Database mới được tạo với status PENDING → ACTIVE
- ✅ Database mới có cùng data với database gốc
- ✅ Database mới xuất hiện trong danh sách databases

#### Test Case 5.2: Clone với tên trùng
- ✅ Nhập tên database đã tồn tại
- ✅ Error: "Database name already exists"

**Kết quả mong đợi:**
- ✅ Clone database thành công
- ✅ Database mới có data giống database gốc
- ✅ Component không render như modal (không có overlay)

---

### 6. 📤📥 Tab Export/Import

**Mục đích:** Export và import SQL dumps

**Cách test:**
1. Vào Database Detail → Tab **Export/Import**
2. Kiểm tra ExportImportDatabase component

**Test Cases:**

#### Test Case 6.1: Export Database
- ✅ Click "Export Database"
- ✅ File SQL được tải xuống tự động
- ✅ File có tên: `{database_name}_export_{timestamp}.sql`
- ✅ File có thể mở và xem được
- ✅ File chứa đầy đủ schema và data

#### Test Case 6.2: Import Database
- ✅ Click "Chọn file SQL"
- ✅ Chọn file .sql đã export trước đó
- ✅ Click "Import Database"
- ✅ Import process bắt đầu
- ✅ Database được import thành công
- ✅ Data trong database khớp với file SQL

#### Test Case 6.3: Import với file không hợp lệ
- ✅ Chọn file không phải .sql
- ✅ Error: "Invalid file type. Please select a .sql file"

**Kết quả mong đợi:**
- ✅ Export database thành công
- ✅ Import database thành công
- ✅ Component không render như modal (không có overlay)

---

## 🔍 Kiểm Tra Navigation và UI

### Test Case: Tab Navigation
- ✅ Click vào các tab → Tab được chuyển đúng
- ✅ Active tab có border-bottom màu xanh
- ✅ Tab icon hiển thị đúng
- ✅ Tab label hiển thị đúng

### Test Case: Header
- ✅ Back button (←) → Quay lại trang Databases
- ✅ Database name hiển thị đúng
- ✅ Status badge hiển thị đúng màu
- ✅ Database ID và Created date hiển thị đúng

### Test Case: Database Status
- ✅ Nếu database status ≠ ACTIVE:
  - Tất cả tabs (trừ Overview) hiển thị message: "Database is {status}. Please wait for it to become ACTIVE before using features."
- ✅ Nếu database status = ACTIVE:
  - Tất cả tabs hoạt động bình thường

---

## ⚠️ Lưu Ý Khi Test

1. **Database phải ACTIVE:** Tất cả tính năng (trừ Overview) chỉ hoạt động với database ACTIVE
2. **Thời gian chờ:**
   - SQL Query: < 1 giây (SELECT) hoặc vài giây (INSERT/UPDATE/DELETE)
   - Backup: 10-30 giây
   - Restore: 1-5 phút (tùy kích thước database)
   - Clone: 2-10 phút (tùy kích thước database)
   - Import: 1-5 phút (tùy kích thước file)
3. **Monitoring Metrics:**
   - **QUAN TRỌNG:** Phải có metrics ngay sau khi DB được tạo
   - Metrics được collect tự động sau mỗi SQL query
   - Metrics được collect khi mở tab Monitoring
4. **SQL Execution Security:**
   - SQL queries phải chạy với user của database đó (không phải root/admin)
   - Dangerous operations bị chặn
   - Multiple statements bị chặn

---

## 🐛 Troubleshooting

### Monitoring không có data:
- ✅ Kiểm tra `collect_metrics` được gọi khi:
  - DB được tạo (trong `create_database` endpoint)
  - Mở tab Monitoring (trong `get_metrics` endpoint)
  - Sau mỗi SQL query (trong `execute_sql_query` endpoint)
- ✅ Kiểm tra logs: `docker compose logs backend | grep -i "collected metrics"`
- ✅ Kiểm tra database có ACTIVE không

### SQL Query không chạy:
- ✅ Kiểm tra database có ACTIVE không
- ✅ Kiểm tra SQL syntax có đúng không
- ✅ Kiểm tra user của database có quyền không
- ✅ Xem logs: `docker compose logs backend | grep -i "sql execution"`

### Backup/Restore không hoạt động:
- ✅ Kiểm tra database có ACTIVE không
- ✅ Kiểm tra MySQL service: `docker compose ps mysql`
- ✅ Xem logs: `docker compose logs backend | grep -i backup`

### Clone không hoạt động:
- ✅ Kiểm tra source database có ACTIVE không
- ✅ Kiểm tra có đủ quota không
- ✅ Xem logs: `docker compose logs backend | grep -i clone`

---

## 📝 Checklist Test

### Tab Overview
- [ ] Database Information Card hiển thị đúng
- [ ] Quick Actions chuyển tab đúng
- [ ] Connection Info hoạt động
- [ ] Reset Password hoạt động

### Tab SQL Query
- [ ] SELECT query hiển thị kết quả
- [ ] INSERT query thành công
- [ ] INSERT duplicate có warning/error đúng
- [ ] UPDATE query thành công
- [ ] DELETE query thành công
- [ ] Dangerous operations bị chặn
- [ ] Multiple statements bị chặn
- [ ] SQL execution dùng user của DB (không phải root)

### Tab Backup & Restore
- [ ] Tạo backup thành công
- [ ] Download backup file
- [ ] Xóa backup
- [ ] Restore database thành công
- [ ] Component không render như modal

### Tab Monitoring
- [ ] **QUAN TRỌNG:** Có metrics ngay sau khi DB tạo
- [ ] Overview tab hiển thị metrics
- [ ] Charts hiển thị data
- [ ] Timeframe selector hoạt động
- [ ] Auto-refresh hoạt động
- [ ] Connections tab hiển thị đúng
- [ ] Slow Queries tab hiển thị đúng
- [ ] Metrics được cập nhật sau SQL queries
- [ ] Component không render như modal

### Tab Clone
- [ ] Clone database thành công
- [ ] Database mới có data giống database gốc
- [ ] Component không render như modal

### Tab Export/Import
- [ ] Export database thành công
- [ ] Import database thành công
- [ ] Component không render như modal

### Navigation & UI
- [ ] Tab navigation hoạt động đúng
- [ ] Back button quay lại đúng
- [ ] Header hiển thị đúng thông tin
- [ ] Status badge hiển thị đúng màu
- [ ] Message hiển thị khi database không ACTIVE

---

## 🎉 Hoàn Thành

Sau khi test xong tất cả tính năng, bạn sẽ có:
- ✅ Overview tab hiển thị đầy đủ thông tin
- ✅ SQL Query tab hoạt động với security đúng
- ✅ Backup & Restore hoạt động tốt
- ✅ **Monitoring luôn có data ngay sau khi DB tạo**
- ✅ Clone tạo database mới thành công
- ✅ Export/Import hoạt động đúng
- ✅ Navigation và UI hoạt động mượt mà

Nếu có vấn đề, hãy kiểm tra logs và thông báo lỗi để debug!

