# Giải Thích QUERIES Metric

## 📊 Các Con Số Bạn Thấy

Khi bạn thấy trong bảng Historical Metrics:

```
Tổng số queries
4.782    3.950    4.527,8    4.782    5
```

### Ý Nghĩa Từng Cột:

1. **Giá trị hiện tại: 4.782**
   - Đây là giá trị QUERIES mới nhất được đo tại thời điểm hiện tại
   - Đơn vị: Tổng số queries từ khi MySQL server khởi động

2. **Thấp nhất (Min): 3.950**
   - Giá trị nhỏ nhất trong 5 lần đo
   - Đây là lần đo đầu tiên hoặc lần đo có giá trị thấp nhất

3. **Trung bình (Avg): 4.527,8**
   - Giá trị trung bình của 5 lần đo
   - Công thức: (3.950 + ... + 4.782) / 5 = 4.527,8
   - Format số có vấn đề: hiển thị "4.527,8" thay vì "4,527.8"

4. **Cao nhất (Max): 4.782**
   - Giá trị lớn nhất trong 5 lần đo
   - Bằng giá trị hiện tại (lần đo cuối cùng)

5. **Số lần đo: 5**
   - Có 5 data points được thu thập trong khoảng thời gian đã chọn (1h, 6h, 24h, 7d)

---

## 🔍 QUERIES Metric Là Gì?

### Nguồn Dữ Liệu:
QUERIES metric được lấy từ MySQL `performance_schema.global_status` với biến `Questions`:

```sql
SELECT VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME = 'Questions'
```

### Đặc Điểm:
- ✅ **Tổng số queries**: Đây là tổng số queries từ khi MySQL server khởi động, không phải queries trong khoảng thời gian
- ✅ **Tăng dần**: Giá trị này chỉ tăng, không bao giờ giảm (trừ khi MySQL restart)
- ✅ **Cumulative**: Là số liệu tích lũy, không phải số liệu tại thời điểm

### Ví Dụ:
```
Lần đo 1 (10:00): 3.950 queries
Lần đo 2 (10:05): 4.100 queries  → Đã chạy thêm 150 queries trong 5 phút
Lần đo 3 (10:10): 4.300 queries  → Đã chạy thêm 200 queries trong 5 phút
Lần đo 4 (10:15): 4.500 queries  → Đã chạy thêm 200 queries trong 5 phút
Lần đo 5 (10:20): 4.782 queries  → Đã chạy thêm 282 queries trong 5 phút
```

**Số queries thực tế trong khoảng thời gian:**
- Từ lần đo 1 đến lần đo 5: 4.782 - 3.950 = **832 queries** trong 20 phút
- Trung bình mỗi phút: 832 / 20 = **41.6 queries/phút**

---

## ⚠️ Vấn Đề Format Số

### Hiện Tại:
- Trung bình hiển thị: **4.527,8** (sai format)
- Nên hiển thị: **4,527.8** hoặc **4527.8**

### Nguyên Nhân:
- Code đang dùng `toLocaleString('en-US')` nhưng có thể browser đang dùng locale khác
- Cần sửa format để nhất quán

---

## 💡 Cách Đọc Đúng

### Để Biết Số Queries Thực Tế:
1. **Xem sự khác biệt giữa các lần đo:**
   - Max - Min = 4.782 - 3.950 = **832 queries** trong khoảng thời gian

2. **Xem giá trị hiện tại:**
   - 4.782 = Tổng số queries từ khi MySQL start

3. **Tính queries/phút hoặc queries/giờ:**
   - Nếu có 5 lần đo trong 1 giờ: 832 queries / 1 giờ = **832 queries/giờ**
   - Nếu có 5 lần đo trong 20 phút: 832 queries / 20 phút = **41.6 queries/phút**

---

## 🔧 Sửa Format Số

Code đã được cập nhật để:
- Format số đúng với dấu phẩy cho phần nghìn
- Làm tròn số nếu không có phần thập phân đáng kể
- Hiển thị rõ ràng hơn

---

## 📝 Kết Luận

Các con số bạn thấy là **bình thường** và **đúng**:
- ✅ Giá trị tăng dần từ 3.950 → 4.782 (đúng với cumulative metric)
- ✅ Trung bình 4.527,8 là đúng (tính từ 5 giá trị)
- ✅ Format số sẽ được sửa để hiển thị đúng

**QUERIES metric cho biết tổng số queries từ khi MySQL start, không phải queries trong khoảng thời gian.**

