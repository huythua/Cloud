# Hướng dẫn cấu hình IPN URL trong VNPay Merchant Admin

## Thông tin đăng nhập
- **URL Merchant Admin**: https://sandbox.vnpayment.vn/merchantv2/
- **Tên đăng nhập**: huythua0@gmail.com
- **Mật khẩu**: (Mật khẩu bạn đã đăng ký khi tạo Merchant môi trường TEST)

## IPN URL cần cấu hình

**⚠️ QUAN TRỌNG**: Có 2 loại URL trong VNPay:

### 1. IPN URL (cấu hình trong Merchant Admin)
Đây là URL để **VNPay server gửi callback** đến backend của bạn:
```
https://be-cloud.tadalabs.vn/payments/vnpay/callback
```
- **Phải là HTTPS**
- **Phải public accessible** (VNPay server phải gọi được)
- **Trỏ về backend** (không phải frontend)

### 2. Return URL (đã cấu hình trong code)
Đây là URL để **redirect user về** sau khi thanh toán:
```
https://cloud.tadalabs.vn/app/payments
```
- URL này đã được cấu hình trong code (`VNPAY_RETURN_URL`)
- User sẽ được redirect về URL này sau khi thanh toán

## Các bước cấu hình

### Bước 1: Đăng nhập vào Merchant Admin
1. Truy cập: https://sandbox.vnpayment.vn/merchantv2/
2. Đăng nhập bằng:
   - **Email**: huythua0@gmail.com
   - **Mật khẩu**: (Mật khẩu bạn đã đăng ký)

### Bước 2: Tìm phần cấu hình IPN/Webhook
Sau khi đăng nhập, bạn sẽ thấy menu quản lý. Tìm các mục sau (tùy theo giao diện VNPay):

**Các vị trí có thể có:**
- **Cấu hình hệ thống** → **IPN URL**
- **Thiết lập** → **URL Callback**
- **Cài đặt** → **Webhook URL**
- **Payment Settings** → **Return URL / IPN URL**

### Bước 3: Nhập IPN URL
1. Tìm trường **IPN URL** hoặc **Webhook URL** hoặc **Callback URL**
   - ⚠️ **KHÔNG phải** Return URL (Return URL đã được cấu hình trong code)
   - ⚠️ **PHẢI là** IPN URL hoặc Webhook URL
2. Nhập URL sau:
   ```
   https://be-cloud.tadalabs.vn/payments/vnpay/callback
   ```
   - Đây là **backend URL** (không phải frontend)
   - VNPay server sẽ gửi POST request đến URL này
3. **Lưu ý quan trọng**:
   - URL phải là **HTTPS** (không phải HTTP)
   - URL phải **public accessible** (VNPay server phải gọi được từ internet)
   - Không có dấu `/` ở cuối
   - Không có khoảng trắng
   - Phải là **backend domain** (`be-cloud.tadalabs.vn`), không phải frontend

### Bước 4: Lưu cấu hình
1. Click nút **Lưu** hoặc **Save** hoặc **Cập nhật**
2. Đợi hệ thống xác nhận cấu hình thành công

### Bước 5: Test IPN (Tùy chọn)
VNPay có thể cung cấp tính năng test IPN:
1. Vào **Kịch bản test (SIT)**: https://sandbox.vnpayment.vn/vnpaygw-sit-testing/user/login
2. Đăng nhập bằng cùng tài khoản
3. Tìm phần **Test IPN** hoặc **Test Callback**
4. Gửi request test đến IPN URL để kiểm tra

## Kiểm tra IPN hoạt động

### Cách 1: Test qua thanh toán thực tế
1. Tạo một payment qua VNPay từ ứng dụng của bạn
2. Thanh toán thành công bằng thẻ test
3. Kiểm tra logs backend để xem có nhận được callback không:
   ```bash
   docker compose logs backend --tail=50 --follow
   ```

### Cách 2: Kiểm tra trong Merchant Admin
1. Vào **Lịch sử giao dịch** hoặc **Transaction History**
2. Tìm giao dịch vừa thực hiện
3. Kiểm tra trạng thái IPN:
   - **Đã gửi IPN**: IPN đã được gửi đến server của bạn
   - **IPN thành công**: Server của bạn đã xác nhận nhận được
   - **IPN thất bại**: Có lỗi khi gửi IPN

## Xử lý lỗi thường gặp

### Lỗi: IPN không được gửi
**Nguyên nhân:**
- IPN URL chưa được cấu hình trong Merchant Admin
- IPN URL không public accessible
- Firewall/security group chặn request từ VNPay
- IPN URL trỏ về frontend thay vì backend

**Giải pháp:**
1. Kiểm tra lại IPN URL trong Merchant Admin:
   - Phải là: `https://be-cloud.tadalabs.vn/payments/vnpay/callback`
   - KHÔNG phải: `https://cloud.tadalabs.vn/...` (đây là frontend)
2. Test IPN URL bằng cách truy cập trực tiếp:
   ```bash
   curl https://be-cloud.tadalabs.vn/payments/vnpay/callback
   ```
   - Nếu trả về lỗi 422 hoặc 400 là bình thường (thiếu params)
   - Nếu không truy cập được → kiểm tra Nginx/firewall
3. Kiểm tra logs backend để xem có request đến không:
   ```bash
   docker compose logs backend --tail=100 | grep -i "vnpay\|callback"
   ```
4. Kiểm tra Nginx Proxy Manager:
   - Đảm bảo domain `be-cloud.tadalabs.vn` đã được cấu hình
   - Đảm bảo SSL certificate hợp lệ
   - Kiểm tra Access List không chặn IP của VNPay

### Lỗi: Checksum không hợp lệ
**Nguyên nhân:**
- SECRET_KEY không đúng
- Checksum được tính sai

**Giải pháp:**
1. Kiểm tra `VNPAY_SECRET_KEY` trong `docker-compose.yml` có đúng không
2. Đảm bảo SECRET_KEY không có khoảng trắng thừa
3. Rebuild backend sau khi sửa: `docker compose up -d --build backend`

### Lỗi: Payment không được cập nhật
**Nguyên nhân:**
- IPN callback không tìm thấy payment
- Payment đã được xử lý rồi (duplicate callback)

**Giải pháp:**
1. Kiểm tra logs backend để xem callback data
2. Kiểm tra `order_id` format: `PAY{payment_id}_{timestamp}`
3. Đảm bảo payment record được tạo trước khi redirect đến VNPay

## Lưu ý quan trọng

1. **IPN URL phải là HTTPS**: VNPay chỉ gửi IPN qua HTTPS
2. **IPN URL phải public**: VNPay server phải gọi được từ internet
3. **Không có trailing slash**: URL không nên kết thúc bằng `/`
4. **Timeout**: IPN callback phải response trong vòng 30 giây
5. **Idempotency**: Xử lý duplicate callback (cùng một transaction có thể gửi nhiều lần)

## Thông tin hỗ trợ

- **Tài liệu VNPay**: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
- **Code demo**: https://sandbox.vnpayment.vn/apis/vnpay-demo/code-demo-tích-hợp
- **Test case**: https://sandbox.vnpayment.vn/vnpaygw-sit-testing/user/login

## Kiểm tra sau khi cấu hình

Sau khi cấu hình IPN URL, bạn có thể test bằng cách:

1. **Tạo payment qua VNPay** từ ứng dụng
2. **Thanh toán thành công** bằng thẻ test
3. **Kiểm tra logs backend**:
   ```bash
   cd /home/tada/cloud/Cloud/cloud_db_mvp
   docker compose logs backend --tail=100 | grep -i "vnpay\|callback\|ipn"
   ```
4. **Kiểm tra database**: Payment status phải là `COMPLETED` và balance đã được cập nhật

