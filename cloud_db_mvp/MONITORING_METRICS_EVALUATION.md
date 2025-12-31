# Đánh Giá Metrics Cho Database Monitoring

## 📊 Metrics Hiện Tại

### ✅ HỢP LÝ:

1. **CONNECTIONS (Kết nối đang hoạt động)**
   - ✅ Hữu ích: Biết số lượng connections hiện tại
   - ✅ Quan trọng: Tránh vượt quá max_connections
   - ⚠️ Cần thêm: Max connections limit để so sánh

2. **MEMORY (Dung lượng lưu trữ)**
   - ✅ Hữu ích: Biết database đang dùng bao nhiêu dung lượng
   - ✅ Quan trọng: Quản lý quota và storage
   - ⚠️ Cần thêm: Buffer pool usage, cache hit rate

### ❌ KHÔNG HỢP LÝ:

3. **QUERIES (Tổng số queries từ khi MySQL start)**
   - ❌ Không hữu ích: Cumulative metric, không phản ánh activity hiện tại
   - ❌ Khó đọc: Không biết database đang hoạt động như thế nào
   - ✅ Đã cải thiện: Hiển thị delta (queries trong khoảng thời gian)
   - 💡 Nên thay bằng: **QPS (Queries Per Second)** hoặc **Queries trong khoảng thời gian**

### ⚠️ CÓ TRONG CODE NHƯNG CHƯA COLLECT:

4. **CPU**
   - ⚠️ Chưa collect: Có trong MetricType nhưng chưa có data
   - ✅ Nên có: CPU usage của MySQL process

5. **RESPONSE_TIME**
   - ⚠️ Chưa collect: Có trong MetricType nhưng chưa có data
   - ✅ Nên có: Average query execution time

6. **THROUGHPUT**
   - ⚠️ Chưa collect: Có trong MetricType nhưng chưa có data
   - ✅ Nên có: Bytes read/written per second

---

## 🎯 Metrics Nên Có (Best Practices)

### 1. **QPS (Queries Per Second)** ⭐ QUAN TRỌNG NHẤT
- **Tại sao:** Phản ánh activity hiện tại của database
- **Cách tính:** Delta queries / Delta time
- **Hữu ích:** Biết database đang xử lý bao nhiêu queries/giây
- **Status:** ✅ Backend đã có tính QPS trong `get_performance_summary()`, chỉ cần hiển thị trong Historical Metrics

### 2. **TPS (Transactions Per Second)**
- **Tại sao:** Quan trọng cho transactional workloads
- **Cách tính:** Từ `Com_commit` và `Com_rollback` trong `performance_schema.global_status`
- **Hữu ích:** Biết số transactions được commit/rollback mỗi giây

### 3. **Average Query Execution Time**
- **Tại sao:** Phản ánh performance của queries
- **Cách tính:** Từ `performance_schema.events_statements_summary_global_by_event_name`
- **Hữu ích:** Biết queries chạy nhanh hay chậm

### 4. **Buffer Pool Hit Rate**
- **Tại sao:** Quan trọng cho performance (cache efficiency)
- **Cách tính:** `(Innodb_buffer_pool_reads / Innodb_buffer_pool_read_requests) * 100`
- **Hữu ích:** Biết cache có hiệu quả không (nên > 99%)

### 5. **Disk I/O (Read/Write)**
- **Tại sao:** Disk I/O là bottleneck phổ biến
- **Cách tính:** Từ `Innodb_data_reads`, `Innodb_data_writes` trong `performance_schema.global_status`
- **Hữu ích:** Biết database đang đọc/ghi bao nhiêu dữ liệu

### 6. **Table Locks**
- **Tại sao:** Table locks có thể gây blocking
- **Cách tính:** Từ `Table_locks_waited` trong `performance_schema.global_status`
- **Hữu ích:** Phát hiện contention issues

### 7. **Threads**
- **Tại sao:** Threads quá nhiều có thể gây vấn đề
- **Cách tính:** `Threads_connected`, `Threads_running` từ `performance_schema.global_status`
- **Hữu ích:** Biết số threads đang chạy

### 8. **Replication Lag** (nếu có replication)
- **Tại sao:** Quan trọng cho high availability
- **Cách tính:** Từ `SHOW SLAVE STATUS`
- **Hữu ích:** Đảm bảo replication không lag quá nhiều

---

## 📋 Đề Xuất Cải Thiện

### Phase 1: Cải thiện metrics hiện có (Ưu tiên cao)

1. **Thay QUERIES bằng QPS**
   - ✅ Backend đã có tính QPS
   - ⏳ Cần: Hiển thị QPS trong Historical Metrics table
   - ⏳ Cần: Collect QPS metric thay vì total queries

2. **Thêm Max Connections vào CONNECTIONS**
   - Hiển thị: "Active: 10 / Max: 100"
   - Cảnh báo khi gần max

3. **Cải thiện MEMORY**
   - Thêm: Buffer pool usage
   - Thêm: Cache hit rate

### Phase 2: Thêm metrics mới (Ưu tiên trung bình)

1. **Average Query Execution Time**
   - Collect từ `performance_schema.events_statements_summary_global_by_event_name`
   - Hiển thị trong Historical Metrics

2. **TPS (Transactions Per Second)**
   - Collect từ `Com_commit` và `Com_rollback`
   - Hiển thị trong Historical Metrics

3. **Disk I/O**
   - Collect từ `Innodb_data_reads/writes`
   - Hiển thị trong Historical Metrics

### Phase 3: Metrics nâng cao (Ưu tiên thấp)

1. **Buffer Pool Hit Rate**
2. **Table Locks**
3. **Threads**
4. **Replication Lag** (nếu có)

---

## 🎨 UI/UX Đề Xuất

### Dashboard Overview:
```
┌─────────────────────────────────────────────────┐
│ Performance Summary                              │
├─────────────────────────────────────────────────┤
│ QPS: 45.2 queries/sec  │  TPS: 12.3 trans/sec  │
│ Avg Response: 15ms     │  Active: 8/100 conn   │
│ Buffer Hit: 99.8%      │  Storage: 125 MB      │
└─────────────────────────────────────────────────┘
```

### Historical Metrics Table:
```
Metric              | Current | Min  | Avg  | Max  | Count
--------------------|---------|------|------|------|------
QPS (queries/sec)   | 45.2    | 12.1 | 32.5 | 78.9 | 60
TPS (trans/sec)     | 12.3    | 5.2  | 9.8  | 18.5 | 60
Avg Response (ms)   | 15.2    | 8.5  | 12.3 | 25.8 | 60
Active Connections   | 8       | 2    | 5.5  | 12   | 60
Buffer Hit Rate (%)  | 99.8    | 98.5 | 99.2 | 99.9 | 60
Storage (MB)         | 125.3   | 120  | 122  | 125  | 60
```

---

## ✅ Kết Luận

### Metrics hiện tại:
- ✅ CONNECTIONS: Hợp lý, cần thêm max limit
- ✅ MEMORY: Hợp lý, cần thêm buffer pool info
- ❌ QUERIES: Không hợp lý, nên thay bằng QPS

### Metrics nên thêm (theo thứ tự ưu tiên):
1. ⭐ **QPS** (Queries Per Second) - QUAN TRỌNG NHẤT
2. ⭐ **TPS** (Transactions Per Second)
3. ⭐ **Average Query Execution Time**
4. ⭐ **Buffer Pool Hit Rate**
5. Disk I/O
6. Table Locks
7. Threads

### Hành động:
1. ✅ Đã cải thiện QUERIES: Hiển thị delta
2. ⏳ Cần: Thay QUERIES bằng QPS trong Historical Metrics
3. ⏳ Cần: Thêm các metrics mới theo priority

