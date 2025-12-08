# Yêu cầu & Ghi chú phát triển Cloud DB MVP

## Ý tưởng tổng thể

- Xây dựng backend cho app dùng và cho thuê Database Cloud.
- Quản lý user, xác thực bảo mật, cho phép tạo/xóa/list database cloud cho từng user.
- Tích hợp module provisioner để tạo/xóa DB vật lý trên MySQL.

## Lộ trình phát triển

1. Khởi tạo lại backend chuẩn hóa, mỗi file có docstring giải thích.
2. Tạo API đăng ký, đăng nhập (JWT).
3. Tạo API tạo/list/xóa database cloud (gọi provisioner).
4. Bổ sung kiểm tra quota, giới hạn số DB/user, log/audit, unit test, v.v.
5. Tích hợp Docker Compose, hướng dẫn chạy dev/test.

## Ghi chú

- Mỗi file Python đều có docstring đầu file giải thích vai trò.
- Ghi chú, yêu cầu mới sẽ bổ sung vào file này để tiện theo dõi.
- Ưu tiên code rõ ràng, dễ mở rộng, dễ bảo trì.
- Mỗi hàm đều có ghi chú mô tả hàm, yêu cầu tất cả dùng tiếng Việt

## Yêu cầu bổ sung (nếu có)

- ... (bạn bổ sung thêm tại đây khi có yêu cầu mới)
